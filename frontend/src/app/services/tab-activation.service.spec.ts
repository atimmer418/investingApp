import { TestBed } from '@angular/core/testing';
import { TabActivationService } from './tab-activation.service';

describe('TabActivationService', () => {
  let service: TabActivationService;

  beforeEach(() => {
    TestBed.configureTestingModule({});
    service = TestBed.inject(TabActivationService);
  });

  it('defaults to tab1', () => {
    expect(service.activeTab()).toBe('tab1');
  });

  it('setActive updates the activeTab signal', () => {
    service.setActive('chat');
    expect(service.activeTab()).toBe('chat');
  });
});
