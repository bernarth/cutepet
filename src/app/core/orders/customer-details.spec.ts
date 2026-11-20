import { signal } from '@angular/core';
import { TestBed } from '@angular/core/testing';
import { form } from '@angular/forms/signals';

import {
  CustomerDetails,
  EMPTY_CUSTOMER_DETAILS,
  customerDetailsSchema,
  toCustomerDetailsRequest,
} from './customer-details';

const customer: CustomerDetails = {
  ...EMPTY_CUSTOMER_DETAILS,
  customerName: '  Eva Mamani ',
  customerPhone: '71234567',
};

function errorsOf(details: CustomerDetails) {
  const detailsForm = TestBed.runInInjectionContext(() =>
    form(signal(details), customerDetailsSchema),
  );
  const messages = (field: keyof CustomerDetails) =>
    detailsForm[field]()
      .errors()
      .map((error) => error.message);

  return {
    valid: detailsForm().valid(),
    name: messages('customerName'),
    phone: messages('customerPhone'),
    city: messages('destinationCity'),
  };
}

describe('customer details form', () => {
  it('accepts a name and a Bolivian mobile starting with 6 or 7', () => {
    expect(errorsOf(customer).valid).toBe(true);
    expect(errorsOf({ ...customer, customerPhone: '61234567' }).valid).toBe(true);
  });

  it('rejects other phone numbers', () => {
    const message = ['Usa 8 dígitos que empiecen con 6 o 7'];

    expect(errorsOf({ ...customer, customerPhone: '22123456' }).phone).toEqual(message);
    expect(errorsOf({ ...customer, customerPhone: '7123456' }).phone).toEqual(message);
    expect(errorsOf({ ...customer, customerPhone: '712345678' }).phone).toEqual(message);
  });

  it('asks for a real name', () => {
    expect(errorsOf({ ...customer, customerName: '   ' }).name).toEqual(['Escribe el nombre']);
    expect(errorsOf({ ...customer, customerName: 'E' }).name).toEqual(['Mínimo 2 letras']);
  });

  it('asks for the city only for bus parcel shipping', () => {
    expect(errorsOf(customer).city).toEqual([]);
    expect(errorsOf({ ...customer, deliveryMethod: 'bus_parcel' }).city).toEqual([
      'Escribe la ciudad de destino',
    ]);
  });
});

describe('toCustomerDetailsRequest', () => {
  it('sends only the pickup data for a pickup order', () => {
    expect(toCustomerDetailsRequest({ ...customer, destinationCity: 'Oruro' })).toEqual({
      customer_name: 'Eva Mamani',
      customer_phone: '71234567',
      delivery_method: 'pickup_point',
    });
  });

  it('uses the customer as recipient when none is given', () => {
    const request = toCustomerDetailsRequest({
      ...customer,
      deliveryMethod: 'bus_parcel',
      destinationCity: ' Santa Cruz ',
    });

    expect(request.destination_city).toBe('Santa Cruz');
    expect(request.recipient_name).toBe('Eva Mamani');
    expect(request.recipient_id_number).toBeUndefined();
  });

  it('keeps a given recipient and ID number', () => {
    const request = toCustomerDetailsRequest({
      ...customer,
      deliveryMethod: 'bus_parcel',
      destinationCity: 'Oruro',
      recipientName: ' Ana Quispe ',
      recipientIdNumber: ' 1234567 LP ',
    });

    expect(request.recipient_name).toBe('Ana Quispe');
    expect(request.recipient_id_number).toBe('1234567 LP');
  });
});
