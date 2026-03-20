export interface Company {
  id: string;
  name: string;
  address: string;
  postalCode: string;
  city: string;
  category: string;
  url: string;
  lat: number;
  lng: number;
}

export interface CompanyLocation {
  id: string;
  companyId: string;
  address: string;
  postalCode: string;
  city: string;
  lat: number;
  lng: number;
}
