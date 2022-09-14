pragma solidity ^0.4.25;

import "../../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";
import "../../node_modules/openzeppelin-solidity/contracts/token/ERC20/ERC20.sol";

contract FlightSuretyData {
    using SafeMath for uint256;
    ERC20 erc20;

    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/

    address private contractOwner;          // Account used to deploy contract
    address private contractAddress;
    bool private operational = true;        // Blocks all state changes throughout the contract if false

    uint256 private totalBalance = 0;       // total of funds raised by companies
    uint256 private totalAirlines = 0;      // totalt number of registered airlines

    // Array to keep trace of registered and funded airlines
    address[] activeAirlines;

    struct Airline {
        address airline;
        bool registered;
        bool funded;
        bytes32[] flightID;
        bytes32[] flightName;
    }

    mapping (address => Airline) Airlines;

    // flight structure
    struct Flight {
        bytes32 flightsID;
        bytes32 flightName;
        bool isRegistered;
        uint8 statusCode;
        uint256 updatedTimestamp;   
        address airline;     
        bytes32[] insuranceID;
    }

    mapping (bytes32 => Flight) Flights;

    // Insurance structure
    struct Insurance {
        bytes32 insuranceID;
        bytes32 flightID;
        address passenger;
        uint256 value;
    }

    mapping (bytes32 => Insurance) Insurances;

    // list of all client's accounts
    mapping (address => uint256) Accounts;

/********************************************************************************************/
    /*                                       FUNCTION MODIFIERS                                 */
    /********************************************************************************************/

    // Modifiers help avoid duplication of code. They are typically used to validate something
    // before a function is allowed to be executed.

    /**
    * @dev Modifier that requires the "operational" boolean variable to be "true"
    *      This is used on all state changing functions to pause the contract in 
    *      the event there is an issue that needs to be fixed
    */
    modifier requireIsOperational() 
    {
        require(operational, "Contract is currently not operational");
        _;  // All modifiers require an "_" which indicates where the function body will be added
    }

    /**
    * @dev Modifier that requires the "ContractOwner" account to be the function caller
    */
    modifier requireContractOwner()
    {
        require(msg.sender == contractOwner, "Caller is not contract owner");
        _;
    }

    /**
    * @dev Modifier that requires the airline to be registered
    */
    modifier requireIsRegistered(address _airline)
    {
        require(Airlines[_airline].registered == true, "Airline is not registered");
        _;
    }

    /**
    * @dev Modifier that requires the airline not to be registered
    */
    modifier requireIsNotRegistered(address _airline)
    {
        require(Airlines[_airline].registered == false, "Airline is already registered");
        _;
    }

    /**
    * @dev Modifier that requires the airline not to be funded
    */
    modifier requireIsNotFunded(address _airline)
    {
        require(Airlines[_airline].funded == false, "Airline is already funded");
        _;
    }

    /**
    * @dev Modifier that requires the flight to be registered
    */
    modifier requireIsFlightRegistered(address _airline)
    {
        require(Airlines[_airline].registered == true, "Airline is not registered");
        _;
    }


    /********************************************************************************************/
    /*                                       EVENT DECLARATION                                */
    /********************************************************************************************/

    event AirlineWasRegistered(address airline, bool registered);
    event AirlineWasFunded(address airline, uint256 amount, bool funded);
    event funded(address airline, address contractAddress, uint256 amount);
    event FlightWasRegistered(bytes32 _flightID, bytes32 _flightName, uint256 _timeStamp, uint8 _statusCode, address _airline);
    event newInsurance(bytes32 insuranceID, bytes32 flightName, address passenger, uint256 value);
    event statusCodeUpddated(address _airline, bytes32 _flightName, uint256 _timestamp, uint8 _statusCode);
    event passengerCredited(address _airline, bytes32 _flightName, uint256 _timeStamp, uint8 _statusCode, address _passenger, uint256 _value);
    event accountTransfer(address _passenger, uint256 _amount, uint256 remainingSolde);

    /********************************************************************************************/
    /*                                         CONSTRUCTOR                                      */
    /********************************************************************************************/

    /**
    * @dev Constructor
    *      The deploying account becomes contractOwner
    */
    constructor
                                (
                                ) 
                                public 
    {
        contractOwner = msg.sender;
        contractAddress = address(this);
        totalAirlines = 0;
    }


    /********************************************************************************************/
    /*                                       UTILITY FUNCTIONS                                  */
    /********************************************************************************************/

    /**
    * @dev Get operating status of contract
    *
    * @return A bool that is the current operating status
    */      
    function isOperational() 
                            external 
                            view
                            returns(bool) 
    {
        return operational;
    }


    /**
    * @dev Sets contract operations on/off
    *
    * When operational mode is disabled, all write transactions except for this one will fail
    */    
    function setOperatingStatus
                            (
                                bool mode
                            ) 
                            external

                            requireContractOwner 
    {
        operational = mode;
    }

    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/

   /**
    * @dev Add an airline to the registration queue
    *      Can only be called from FlightSuretyApp contract
    *
    */   
    function registerAirline
                            (   
                                address _airline
                            )
                            external
                            requireIsOperational
                            requireIsNotRegistered(_airline)
    {
        // Initiate airline into Airlines mapping
        Airlines[_airline].airline = _airline;
        Airlines[_airline].registered = true;
        Airlines[_airline].funded = false;
        // Add 1 to the airline's count
        totalAirlines = totalAirlines.add(1);
        // emit event
        emit AirlineWasRegistered(_airline, Airlines[_airline].registered);
    }

    // Return true if an airline is registered
    function isAirline 
                        (
                            address _airline 
                        )
                        external 
                        view 
                        requireIsOperational
                        returns(bool)
    {
        return Airlines[_airline].registered;
    }

    // Return the number of registered airlines
    function howManyRegisteredAirlines 
                        ()
                        external
                        view
                        requireIsOperational 
                        returns(uint256)
    {
        return totalAirlines;
    }

    // Return the list of registered airlines
    function whatAirlines 
                        ()
                        external
                        view
                        requireIsOperational 
                        returns(address[])
    {
        return activeAirlines;
    }

   /**
    * @dev Fund an airline
    *
    */   
    function submitFundsAirline
                            (   
                                address _airline,
                                uint256 _amount
                            )
                            external
                            payable
                            requireIsOperational
                            requireIsRegistered(_airline)
                            requireIsNotFunded(_airline)

    {
        // Store the actual balance of the contract
        uint256 beforeBalance = Accounts[address(this)];
        // Send the amount to the fund function
        // to transfer the amount to the contract address
        // and add the amount to the contract balance
        fund(_airline, _amount);
        // Check if the balance has been increased
        require(Accounts[address(this)].sub(beforeBalance) == _amount, "Funds have not been provided");
        // Mark the airline as "funded"
        
        // Airlines[_airline] = Airline({airline: _airline, registered: true, funded: true, flight: });
        Airlines[_airline].funded = true;
        activeAirlines.push(_airline);
        emit AirlineWasFunded(_airline, _amount, Airlines[_airline].funded);
    }

    // Return true if an airline is funded
    function isFundedAirline 
                        (
                            address _airline 
                        )
                        external
                        view 
                        requireIsOperational
                        returns(bool)
    {
        return Airlines[_airline].funded;
    }

   /**
    * @dev Add a flight 
    *      Can only be called from FlightSuretyApp contract
    *
    */ 

    function registerFlight
                            (   
                                bytes32 _flightName,
                                uint256 _timeStamp,
                                uint8 _statusCode,
                                address _airline
                            )
                            external
                            requireIsOperational
    {
        // Get a unique 32 bytes ID to the flight given airline, flight name and timestamp
        bytes32 _flightID = getFlightKey(_airline, _flightName, _timeStamp);
        // Check if the flight has not been registered yet
        require(Flights[_flightID].isRegistered == false, "Flight is already registered");
        // Initiate flight into flight's mapping
        Flights[_flightID].flightsID = _flightID;
        Flights[_flightID].flightName = _flightName;
        Flights[_flightID].isRegistered = true;
        Flights[_flightID].statusCode = _statusCode;
        Flights[_flightID].updatedTimestamp = _timeStamp;
        Flights[_flightID].airline = _airline;
        // Add flight ID to Airline in airlines mapping
        Airlines[_airline].flightID.push(_flightID);
        Airlines[_airline].flightName.push(bytes32(_flightName));
        // Emit event
        emit FlightWasRegistered(_flightID, _flightName, _timeStamp, _statusCode, _airline);
    }

    // Return the list of registered flight by airlines
    function whatFlight
                        (
                            address _airline
                        )
                        external
                        view
                        requireIsOperational 
                        returns(bytes32[])
    {
        return Airlines[_airline].flightID;
    }

    // Return the list of flight's name
    function whatFlightName
                        (
                            bytes32 _flightID
                        )
                        external
                        view
                        requireIsOperational 
                        returns(bytes32)
    {
        return Flights[_flightID].flightName;
    }

    // Return the list of flight's name
    function whatFlightTimestamp
                        (
                            bytes32 _flightID
                        )
                        external
                        view
                        requireIsOperational 
                        returns(uint256)
    {
        return Flights[_flightID].updatedTimestamp;
    }

    // Return true if a flight is registered
    function isFlight 
                        (
                            bytes32 _flightName,
                            uint256 _timeStamp,
                            address _airline
                        )
                        external
                        view 
                        requireIsOperational
                        returns(bool)
    {
        bytes32 _flightID = getFlightKey(_airline, _flightName, _timeStamp);
        return Flights[_flightID].isRegistered;
    }

    // Return status code of a flight
    function viewFlightSatus 
                            (
                            bytes32 _flightID                           
                            )
                            external
                            view
                            returns(uint256)
    {
        // Check if flight is registered
        require(Flights[_flightID].isRegistered == true, "Flight must first be registered before to get status");
        return Flights[_flightID].statusCode;  
    }

    // Return status code of a flight Test function
    function viewFlightSatusTest 
                            (
                            bytes32 _flightName,
                            uint256 _timeStamp,
                            address _airline                          
                            )
                            external
                            view
                            returns(uint256)
    {
        // Check if flight is registered
        bytes32 _flightID = getFlightKey(_airline, _flightName, _timeStamp);
        require(Flights[_flightID].isRegistered == true, "Flight must first be registered before to get status");
        return Flights[_flightID].statusCode;  
    }

   /**
    * @dev Buy insurance for a flight
    *
    */   
    function buyInsurance
                            (   
                                    bytes32 _flightName,
                                    uint256 _timeStamp,
                                    address _airline,
                                    address _passenger,
                                    uint256 _value                       
                            )
                            external
                            payable
    {
        // Record account balance before it changes
        uint256 beforeBalance = Accounts[address(this)];
        // Get a unique 32 bytes ID to flight given airline, flight name and timestamp
        bytes32 _flightID = getFlightKey(_airline, _flightName, _timeStamp); 
        // Check if flight is registered
        require(Flights[_flightID].isRegistered == true, "Flight is not registered");
        // Get a unique 32 bytes ID to insurance given flight id, passenger address and amount given.
        bytes32 _insuranceID = getInsuranceKey(_flightID, _passenger, _value); 
        // check if insurance has not been yet pursued by the client
        require(Insurances[_insuranceID].value == 0, "Insurance can not be pursued more than once");
        // Fund contract with insurance
        fund(_passenger, _value);
        // Check if the balance has been increased
        require(Accounts[address(this)].sub(beforeBalance) == _value, "Funds have not been provided");
        // Initiate insurance in insurance mapping
        Insurances[_insuranceID] = Insurance({insuranceID: _insuranceID, flightID: _flightID, passenger: _passenger, value: _value});
        // Add insurance ID to flight in flights mapping
        Flights[_flightID].insuranceID.push(_insuranceID);
        // Emit event
        emit newInsurance(_insuranceID, _flightName, _passenger, _value);
    }

    // return true if the passenger is insured for a flight
    function isInsured
                        (
                            bytes32 _flightName,
                            uint256 _timeStamp,
                            address _airline,
                            address _passenger,
                            uint256 _value
                        )
                        external
                        view
                        returns(bool)
    {
        // Get a unique 32 bytes ID to the flight given airline, flight name and timestamp
        bytes32 _flightID = getFlightKey(_airline, _flightName, _timeStamp); 
        // Check if the flight is registered
        require(Flights[_flightID].isRegistered == true, "Flight is not registered");
        // Get a unique 32 bytes ID to the insurance given flight id, passenger address and amount given.
        bytes32 _insuranceID = getInsuranceKey(_flightID, _passenger, _value);
        // check if insurance has been initiate
        if(Insurances[_insuranceID].passenger == _passenger) return true;   
        return false;
    }

    /**
     *  @dev Credits payouts to insurees
    */
    function creditInsurees
                                (
                                    address _airline,
                                    bytes32 _flightName,
                                    uint256 _timestamp,
                                    uint8 _statusCode
                                )
                                external
    {
        /// Update flight status 
        bytes32 _flightID = getFlightKey(_airline, _flightName, _timestamp); 
        // Check if the flight is registered
        require(Flights[_flightID].isRegistered == true, "Flight is not registered");
        // Check if the status of the flight has not previously been set in order to avoid multiple credit
        require(Flights[_flightID].statusCode == 0, "Status of this flight have already been set");
        // Update status for the flight
        Flights[_flightID].statusCode = _statusCode;
        emit statusCodeUpddated(_airline, _flightName, _timestamp, _statusCode);
        /// Credit passenger sold
        // Process credit only if flight is delayed
        if(_statusCode > 10){
            // check first if an insurance have been taken on this flight before looping through the array
            require(Flights[_flightID].insuranceID.length > 0, "There is no insurance on this flight");
            // Loop through all flight's insurance
            for(uint i; i < Flights[_flightID].insuranceID.length; i++) {
                bytes32 _insuranceID = Flights[_flightID].insuranceID[i];
                address _passenger = Insurances[_insuranceID].passenger;
                uint256 _value = Insurances[_insuranceID].value.mul(3).div(2);
                // Credit passenger account according to it's insurance amount
                Accounts[_passenger] = Accounts[_passenger].add(_value);
                // Debit contract's account
                Accounts[address(this)] = Accounts[address(this)].sub(_value);
                emit passengerCredited(_airline, _flightName, _timestamp, _statusCode, _passenger, _value);
            }
        }
    }
    
    /**
     *  @dev Buy insurance for a flight
     *
    */
    function buy
                            (
                            )
                            external
                            pure
    {
    }


    /**
     *  @dev Transfers eligible payout funds to insuree
     *
    */
    function withdraw
                            (
                                address caller,
                                uint256 _amount
                                
                            )
                            external
                            payable
    {
        require(Accounts[caller] >= _amount, "You don't have sufficient funds to withdraw this amount");
        Accounts[caller] = Accounts[caller].sub(_amount);
        // caller.transfer(_amount);
        emit accountTransfer(caller, _amount, Accounts[caller]);
    }

   /**
    * @dev Initial funding for the insurance. Unless there are too many delayed flights
    *      resulting in insurance payouts, the contract should be self-sustaining
    *
    */   
    function fund
                            (   
                                address _account,
                                uint256 _value
                            )
                            public
                            payable
    {
        // Transfer the amount to the contract address
        // erc20.transferFrom(_account, address(this), _value);
        // address(this).transfer(_value);
        // Increase the balance of the contract
        Accounts[address(this)] = Accounts[address(this)].add(_value);
        emit funded(_account, address(this), _value);
    }

   /**
    * @dev Get the balance of an client's account
    *      A delayed flight will produce a transfer from the contract's balance to the client's account
    *
    */  
    function getBalance
                            (
                                address _account
                            )
                            external
                            view
                            returns(uint256)
    {
        return Accounts[_account];
    }

   /**
    * @dev Get the balance of the contract's account
    *
    */
    function getContractBalance
                            (
                            )
                            external
                            view
                            returns(uint256)
    {
        return Accounts[address(this)];
    }


    /**
    * @dev Return the unique Id of a flight
    *
    */
    function getFlightKey
                        (
                            address _airline,
                            bytes32 _flight,
                            uint256 _timestamp
                        )
                        pure
                        internal
                        returns(bytes32) 
    {
        return keccak256(abi.encodePacked(_airline, _flight, _timestamp));
    }

    /**
    * @dev Return the unique Id of an insurance
    *
    */
    function getInsuranceKey
                        (
                            bytes32 _flightID,
                            address _passenger,
                            uint256 _value
                        )
                        pure
                        internal
                        returns(bytes32) 
    {
        return keccak256(abi.encodePacked(_flightID, _passenger, _value));
    }

    /**
    * @dev Fallback function for funding smart contract.
    *
    */
    function() 
                            external 
                            payable 
    {
        fund(msg.sender, msg.value);
    }


}

