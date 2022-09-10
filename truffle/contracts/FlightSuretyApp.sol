pragma solidity ^0.4.25;

// It's important to avoid vulnerabilities due to numeric overflow bugs
// OpenZeppelin's SafeMath library, when used correctly, protects agains such bugs
// More info: https://www.nccgroup.trust/us/about-us/newsroom-and-events/blog/2018/november/smart-contract-insecurity-bad-arithmetic/

import "../../node_modules/openzeppelin-solidity/contracts/math/SafeMath.sol";

import "./FlightSuretyData.sol";



/************************************************** */
/* FlightSurety Smart Contract                      */
/************************************************** */
contract FlightSuretyApp {
    using SafeMath for uint256; // Allow SafeMath functions to be called for all uint256 types (similar to "prototype" in Javascript)
    /********************************************************************************************/
    /*                                       DATA VARIABLES                                     */
    /********************************************************************************************/

    // Data contract reference
    FlightSuretyData private flightSuretyData;
    address flightSuretyDataContractAddress;
    // Address used to deploy contract
    address private contractOwner;        

    // Flight status codees
    uint8 private constant STATUS_CODE_UNKNOWN = 0;
    uint8 private constant STATUS_CODE_ON_TIME = 10;
    uint8 private constant STATUS_CODE_LATE_AIRLINE = 20;
    uint8 private constant STATUS_CODE_LATE_WEATHER = 30;
    uint8 private constant STATUS_CODE_LATE_TECHNICAL = 40;
    uint8 private constant STATUS_CODE_LATE_OTHER = 50;


    // Amount of funding
    uint256 public constant FLIGHT_INSURANCE_AMOUNT = 1 ether;
    uint256 public constant AIRLINE_REGISTRATION_FEE = 10 ether;

    // Mapping to keep records of airlines voters per airline
    mapping(address => address[]) multiCallsAirlines;

    // flight structure
    struct Flight {
        bool isRegistered;
        uint8 statusCode;
        uint256 updatedTimestamp;        
        address airline;
    }
    // mapping of all flights recorded
    mapping(bytes32 => Flight) private flights;



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
         // Modify to call data contract's status
        require(true, "Contract is currently not operational");  
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

    modifier requireEnoughFunds() {
        require(msg.value == AIRLINE_REGISTRATION_FEE, "You must provide enough Ethers to fund the seed");
        _;
    }

    modifier requireRegisteredAirline()
    {
        require(flightSuretyData.isAirline(msg.sender) == true, "Airline making the call is not registred");
        _;
    }

    modifier requireFundedAirline()
    {
        require(flightSuretyData.isFundedAirline(msg.sender) == true, "Airline making the call has not provided funds");
        _;
    }

    modifier requireHasNotVoted(address[] multiCalls)
    {
        bool isDuplicate = false;
        for(uint c=0; c<multiCalls.length; c++) {
            if (multiCalls[c] == msg.sender) {
                isDuplicate = true;
                _;
            }
        }
        require(!isDuplicate, "Caller has already called this function");
        _;
    }

    modifier requireRequiredValue() {
        require(msg.value > 0 && msg.value <= FLIGHT_INSURANCE_AMOUNT, "You must provide enough Ethers to buy an insurance");
        _;
    }

    /********************************************************************************************/
    /*                                       EVENTS DECLARATION                                */
    /********************************************************************************************/

    event AirlineWasRegisteredApp(address airline);
    event AirlineWasFundedApp(address airline, uint256 amount);
    event AirlineHasOneMoreVote(address airline, uint256 vote);
    event FlightWasRegisteredApp(bytes32 _flightName, uint256 _timeStamp, address _airline);
    event newInsuranceApp(bytes32 flightName, address passenger, uint256 value);
    event flightHasBeenProcessed(address airline, bytes32 flight, uint256 timestamp, uint8 statusCode);

    /********************************************************************************************/
    /*                                       CONSTRUCTOR                                        */
    /********************************************************************************************/

    /**
    * @dev Contract constructor
    *
    */
    constructor
                                (
                                    address _dataContract
                                ) 
                                public 
    {
        contractOwner = msg.sender;
        flightSuretyDataContractAddress = _dataContract;
        flightSuretyData = FlightSuretyData(_dataContract);
    }

    /********************************************************************************************/
    /*                                       UTILITY FUNCTIONS                                  */
    /********************************************************************************************/

    function isOperational() 
                            external 
                            returns(bool) 
    {
        return flightSuretyData.isOperational();  // call data contract's status
    }

   /**
    * @dev returns the number of voters divided by 2
    *
    */ 
    function calculThreshold 
                            (
                                uint256 numberOfVoters
                            )
                            returns(uint256 number)
    {
        uint256 threshold = numberOfVoters.div(2);
        if(numberOfVoters % 2 == 1) {
            return threshold.add(1);
        } else {
            return threshold;
        }
    }

   /**
    * @dev test if enough votes have been collected according to a given threshold
    *
    */ 
    function hasEnoughVotes
                            (
                            address[] multiCalls,
                            uint256 threshold
                            )
                            returns(bool)
    {
        if (multiCalls.length >= threshold) {
            return true;    
        } else {
            return false;
        }
    }

    /********************************************************************************************/
    /*                                     SMART CONTRACT FUNCTIONS                             */
    /********************************************************************************************/

  
   /**
    * @dev allow contracts owner to register and fund the registration of a first airline
    *
    */   

    function registerFirstAirline
                                    (
                                    address _airline
                                    ) 
                                    requireContractOwner
                                    returns(bool)
    {
        flightSuretyData.registerAirline(_airline);
        emit AirlineWasRegisteredApp(_airline);
        return flightSuretyData.isAirline(_airline);
    }

       /**
    * @dev Add an airline to the registration queue
    *
    */   

    function registerAirline
                            (
                                address _airline   
                            )
                            public
                            requireIsOperational
                            requireRegisteredAirline
                            requireFundedAirline
                            requireHasNotVoted(multiCallsAirlines[_airline])
                            returns(bool success, uint256 votes)
    {
        // Initialize a variable to simplifie the if statement and avoid redundant code
        bool canBeRegistered =  false;
        // Calculate vote threshold according to the number of registered airlines
        uint256 threshold =  calculThreshold(flightSuretyData.howManyRegisteredAirlines());
        // Test if the number of registered airlines exceed 4
        if(flightSuretyData.howManyRegisteredAirlines() >= 4) {
            // Add the voter to the airline's list of voters 
            multiCallsAirlines[_airline].push(msg.sender);
            // Emit an event to keep trace of the number of votes
            emit AirlineHasOneMoreVote(msg.sender, multiCallsAirlines[_airline].length);
            
            // Check if the number of votes have reached the threshold
            if(hasEnoughVotes(multiCallsAirlines[_airline], threshold)){
                // Reset the array of voters of the newly registered airline
                multiCallsAirlines[_airline] = new address[](0);  
                canBeRegistered =  true;
            }     
        } else {
            canBeRegistered =  true;
        }
        // Register the airline and emit the according event if requirements are met
        if(canBeRegistered){
            // Ensure that the number of votes have been set to 0 
            require(multiCallsAirlines[_airline].length == 0, "number of votes should be set to 0");
            flightSuretyData.registerAirline(_airline);
            emit AirlineWasRegisteredApp(_airline);
        }
        return (flightSuretyData.isAirline(_airline), multiCallsAirlines[_airline].length);
    }

       /**
    * @dev submit funds to fund an airline
    * 
    */

    function submitFundsAirline
                                (
                                )
                                public
                                payable
                                requireIsOperational
                                requireEnoughFunds
                                returns(bool succes)
    {
        // Pass registration fees to data contract to allow the airline to fund the seed.
        // address(this).transfer(100000000000);
        flightSuretyData.submitFundsAirline(msg.sender, AIRLINE_REGISTRATION_FEE);
        // Emit according event
        emit AirlineWasFundedApp(msg.sender, AIRLINE_REGISTRATION_FEE);
        return (flightSuretyData.isFundedAirline(msg.sender));
    }


    function getActiveAirlines 
                                (
                                )
                                public
                                requireIsOperational
                                returns(address[])
    {
        return flightSuretyData.whatAirlines();
    }

   /**
    * @dev Register a future flight for insuring.
    *
    */  
    function registerFlight
                                (
                                    bytes32 _flightName,
                                    uint256 _timeStamp
                                )
                                requireRegisteredAirline
                                requireFundedAirline
                                external
                                returns(bool success)
    {
        // Send request to data contract to register a flight
        flightSuretyData.registerFlight(_flightName, _timeStamp, STATUS_CODE_UNKNOWN, msg.sender);
        // Emit according event
        emit FlightWasRegisteredApp(_flightName, _timeStamp, msg.sender);
        return flightSuretyData.isFlight(_flightName, _timeStamp, msg.sender);
    }

    function getAirlinesFlights 
                                (
                                    address _airline
                                )
                                public
                                requireIsOperational
                                returns(bytes32[])
    {
        return flightSuretyData.whatFlight(_airline);
    }

    /**
    * @dev Allows passenger to insure a flight
    *
    */ 

    function buyInsurance
                            (
                                    bytes32 _flightName,
                                    uint256 _timeStamp,
                                    address _airline
                            )
                            payable
                            requireRequiredValue
                            returns(bool success)
    {
        // Send request to data contract to insure a flight
        flightSuretyData.buyInsurance(_flightName, _timeStamp, _airline, msg.sender, msg.value);
        // Emit according event
        emit newInsuranceApp(_flightName, msg.sender, msg.value);
        return flightSuretyData.isInsured(_flightName, _timeStamp, _airline, msg.sender, msg.value);
    }
    
   /**
    * @dev Called after oracle has updated flight status
    *
    */  
    function processFlightStatus
                                (
                                    address airline,
                                    bytes32 flight,
                                    uint256 timestamp,
                                    uint8 statusCode
                                )
                                
    {
        flightSuretyData.creditInsurees(airline, flight, timestamp, statusCode);
        emit flightHasBeenProcessed(airline, flight, timestamp, statusCode);
    }


    // Generate a request for oracles to fetch flight information
    function fetchFlightStatus
                        (
                            address airline,
                            bytes32 flight,
                            uint256 timestamp                            
                        )
                        external
    {
        uint8 index = getRandomIndex(msg.sender);

        // Generate a unique key for storing the request
        bytes32 key = keccak256(abi.encodePacked(index, airline, flight, timestamp));
        oracleResponses[key] = ResponseInfo({
                                                requester: msg.sender,
                                                isOpen: true
                                            });

        emit OracleRequest(index, airline, flight, timestamp);
    } 


// region ORACLE MANAGEMENT

    // Incremented to add pseudo-randomness at various points
    uint8 private nonce = 0;    

    // Fee to be paid when registering oracle
    uint256 public constant REGISTRATION_FEE = 1 ether;

    // Number of oracles that must respond for valid status
    uint256 private constant MIN_RESPONSES = 3;


    struct Oracle {
        bool isRegistered;
        uint8[3] indexes;        
    }

    // Track all registered oracles
    mapping(address => Oracle) private oracles;

    // Model for responses from oracles
    struct ResponseInfo {
        address requester;                              // Account that requested status
        bool isOpen;                                    // If open, oracle responses are accepted
        mapping(uint8 => address[]) responses;          // Mapping key is the status code reported
                                                        // This lets us group responses and identify
                                                        // the response that majority of the oracles
    }

    // Track all oracle responses
    // Key = hash(index, flight, timestamp)
    mapping(bytes32 => ResponseInfo) private oracleResponses;

    // Event fired each time an oracle submits a response
    event FlightStatusInfo(address airline, bytes32 flight, uint256 timestamp, uint8 status);

    event OracleReport(address airline, bytes32 flight, uint256 timestamp, uint8 status);

    // Event fired when flight status request is submitted
    // Oracles track this and if they have a matching index
    // they fetch data and submit a response
    event OracleRequest(uint8 index, address airline, bytes32 flight, uint256 timestamp);


    // Register an oracle with the contract
    function registerOracle
                            (
                            )
                            external
                            payable
    {
        // Require registration fee
        require(msg.value >= REGISTRATION_FEE, "Registration fee is required");

        uint8[3] memory indexes = generateIndexes(msg.sender);

        oracles[msg.sender] = Oracle({
                                        isRegistered: true,
                                        indexes: indexes
                                    });
    }

    function getMyIndexes
                            (
                            )
                            view
                            external
                            returns(uint8[3])
    {
        require(oracles[msg.sender].isRegistered, "Not registered as an oracle");

        return oracles[msg.sender].indexes;
    }




    // Called by oracle when a response is available to an outstanding request
    // For the response to be accepted, there must be a pending request that is open
    // and matches one of the three Indexes randomly assigned to the oracle at the
    // time of registration (i.e. uninvited oracles are not welcome)
    function submitOracleResponse
                        (
                            uint8 index,
                            address airline,
                            bytes32 flight,
                            uint256 timestamp,
                            uint8 statusCode
                        )
                        external
    {
        require((oracles[msg.sender].indexes[0] == index) || (oracles[msg.sender].indexes[1] == index) || (oracles[msg.sender].indexes[2] == index), "Index does not match oracle request");


        bytes32 key = keccak256(abi.encodePacked(index, airline, flight, timestamp)); 
        require(oracleResponses[key].isOpen, "Flight or timestamp do not match oracle request");

        oracleResponses[key].responses[statusCode].push(msg.sender);

        // Information isn't considered verified until at least MIN_RESPONSES
        // oracles respond with the *** same *** information
        emit OracleReport(airline, flight, timestamp, statusCode);
        if (oracleResponses[key].responses[statusCode].length >= MIN_RESPONSES) {

            emit FlightStatusInfo(airline, flight, timestamp, statusCode);

            // Handle flight status as appropriate
            processFlightStatus(airline, flight, timestamp, statusCode);
        }
    }


    function getFlightKey
                        (
                            address airline,
                            string flight,
                            uint256 timestamp
                        )
                        pure
                        internal
                        returns(bytes32) 
    {
        return keccak256(abi.encodePacked(airline, flight, timestamp));
    }

    // Returns array of three non-duplicating integers from 0-9
    function generateIndexes
                            (                       
                                address account         
                            )
                            internal
                            returns(uint8[3])
    {
        uint8[3] memory indexes;
        indexes[0] = getRandomIndex(account);
        
        indexes[1] = indexes[0];
        while(indexes[1] == indexes[0]) {
            indexes[1] = getRandomIndex(account);
        }

        indexes[2] = indexes[1];
        while((indexes[2] == indexes[0]) || (indexes[2] == indexes[1])) {
            indexes[2] = getRandomIndex(account);
        }

        return indexes;
    }

    // Returns array of three non-duplicating integers from 0-9
    function getRandomIndex
                            (
                                address account
                            )
                            internal
                            returns (uint8)
    {
        uint8 maxValue = 10;

        // Pseudo random number...the incrementing nonce adds variation
        uint8 random = uint8(uint256(keccak256(abi.encodePacked(blockhash(block.number - nonce++), account))) % maxValue);

        if (nonce > 250) {
            nonce = 0;  // Can only fetch blockhashes for last 256 blocks so we adapt
        }

        return random;
    }

// endregion
}   

