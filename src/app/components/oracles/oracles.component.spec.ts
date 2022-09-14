import { ComponentFixture, TestBed } from '@angular/core/testing';

import { OraclesComponent } from './oracles.component';

describe('OraclesComponent', () => {
  let component: OraclesComponent;
  let fixture: ComponentFixture<OraclesComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ OraclesComponent ]
    })
    .compileComponents();
  });

  beforeEach(() => {
    fixture = TestBed.createComponent(OraclesComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
