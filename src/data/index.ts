import federalData from './statutes/federal.json';
import caData from './statutes/CA.json';
import nyData from './statutes/NY.json';
import txData from './statutes/TX.json';
import flData from './statutes/FL.json';
import ilData from './statutes/IL.json';
import { JurisdictionRules } from '../contracts';

export const JURISDICTION_RULES: Record<string, JurisdictionRules> = {
  FED: federalData as unknown as JurisdictionRules,
  CA: caData as unknown as JurisdictionRules,
  NY: nyData as unknown as JurisdictionRules,
  TX: txData as unknown as JurisdictionRules,
  FL: flData as unknown as JurisdictionRules,
  IL: ilData as unknown as JurisdictionRules,
};

export const JURISDICTION_OPTIONS = [
  { code: 'CA', label: 'California (Cal. Civ. Code & AB 12)' },
  { code: 'NY', label: 'New York (N.Y. GOB & RPL / HSTPA)' },
  { code: 'TX', label: 'Texas (Tex. Prop. Code Ch. 92)' },
  { code: 'FL', label: "Florida (Fla. Stat. Ch. 83 & Miya's Law)" },
  { code: 'IL', label: 'Illinois (765 ILCS 710 & 715)' },
  { code: 'FED', label: 'Federal Baseline Only (FHA / SCRA)' },
];

export const SAMPLE_LEASES: Record<string, { title: string; jurisdiction: string; text: string }> = {
  ca: {
    title: 'California Lease (AB 12 Predatory Clauses)',
    jurisdiction: 'CA',
    text: `RESIDENTIAL LEASE AGREEMENT

This Residential Lease Agreement ("Agreement") is made and entered into on this 1st day of October, 2026, by and between Pacific Crest Management ("Landlord") and Jane Doe ("Tenant").

SECTION 1. PREMISES AND TERM
Landlord hereby leases to Tenant the real property located at 742 Evergreen Terrace, Apt 3B, San Francisco, CA 94102 for a term of twelve (12) months commencing on November 1, 2026.

SECTION 2. MONTHLY RENT
Tenant agrees to pay Landlord monthly rent in the amount of $2,800.00, payable on or before the first day of each calendar month.

SECTION 3. SECURITY DEPOSIT
Tenant shall deposit with Landlord the sum of $5,600.00 (two months' rent) as a security deposit to guarantee the faithful performance of all covenants herein. Landlord shall have sixty (60) days following surrender of the premises to inspect, deduct damages, and return any remaining balance.

SECTION 4. LATE CHARGES AND RETURNED CHECKS
If rent is not received by Landlord by 11:59 PM on the 1st day of the month, Tenant shall pay a flat late fee of $250.00 immediately, plus an additional $25.00 for each calendar day rent remains delinquent.

SECTION 5. RIGHT OF ENTRY
Landlord and Landlord's agents reserve the right to enter the premises at any time without prior written or oral notice for purposes of inspection, showing prospective buyers or renters, or making alterations.

SECTION 6. MAINTENANCE AND REPAIRS
Tenant accepts the premises in strictly "AS-IS" condition. Tenant waives all implied warranties of habitability and shall be solely responsible for all maintenance, plumbing clogs, appliance repairs, heating systems, and roof leaks regardless of cause or pre-existing conditions.

SECTION 7. DEFAULT AND SELF-HELP REMEDIES
If Tenant breaches any term or fails to pay rent within three days, Landlord may immediately re-enter premises, terminate utility services, change door locks, and remove and dispose of Tenant's personal property without court process or judicial eviction proceedings.

SECTION 8. GOVERNING LAW
This agreement shall be construed under the laws of the State of California.`
  },
  ny: {
    title: 'New York Lease (HSTPA Deposit & Late Fee Violations)',
    jurisdiction: 'NY',
    text: `STANDARD APARTMENT LEASE - STATE OF NEW YORK

Date: September 15, 2026
Landlord: Gotham Realty Associates LLC
Tenant: John Smith
Building Address: 450 W 42nd St, Apt 14D, New York, NY 10036

1. LEASE TERM
The term of this lease shall be for 1 year beginning October 1, 2026 and ending September 30, 2027.

2. RENT AMOUNT
The monthly rent is $3,200.00 payable on the first day of each month.

3. SECURITY DEPOSIT
Tenant shall deposit $6,400.00 (two months rent) upon signing. Landlord shall return the deposit within 45 days after Tenant vacates the apartment.

4. LATE PAYMENT PENALTY
If rent is not paid by the 2nd day of the month, Tenant shall pay a late fee equal to 15% of the monthly rent ($480.00).

5. ACCESS TO PREMISES
Landlord may enter the apartment at any hour without notice to inspect or repair.

6. CONDITION OF PREMISES
Tenant acknowledges premises are in satisfactory condition and waives any claim regarding warranty of habitability under New York law.

7. RE-ENTRY BY OWNER
If Tenant fails to pay rent, Landlord may immediately pad-lock apartment doors and remove Tenant's belongings without legal proceedings.`
  },
  fed: {
    title: 'Federal Baseline Violations (FHA Familial & Service Animals / SCRA)',
    jurisdiction: 'FED',
    text: `RESIDENTIAL LEASE AGREEMENT
Landlord: National Property Holdings LLC
Premises: 100 Main Street, Unit 5

SECTION 1. OCCUPANCY RESTRICTIONS
Adults only. No children allowed in the building under any circumstances. Any tenant who has a child during tenancy shall pay a $500 monthly surcharge.

SECTION 2. ANIMAL POLICY
Strict no pets policy. No animals under any circumstances, including service animals or emotional support animals. Anyone with an assistance animal must pay a $1,000 non-refundable pet deposit.

SECTION 3. MILITARY DEPLOYMENT
Tenant waives all rights under the Servicemembers Civil Relief Act (SCRA). No early termination allowed for military transfer or deployment.`
  }
};
