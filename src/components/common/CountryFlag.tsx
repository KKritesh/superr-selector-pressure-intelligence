const codes: Record<string, string> = {
  Afghanistan: 'AF',
  Australia: 'AU',
  Bangladesh: 'BD',
  Canada: 'CA',
  England: 'GB-ENG',
  'Hong Kong': 'HK',
  India: 'IN',
  Ireland: 'IE',
  Japan: 'JP',
  Kuwait: 'KW',
  Namibia: 'NA',
  Nepal: 'NP',
  Netherlands: 'NL',
  'New Zealand': 'NZ',
  Oman: 'OM',
  Pakistan: 'PK',
  Scotland: 'GB-SCT',
  Singapore: 'SG',
  'South Africa': 'ZA',
  'Sri Lanka': 'LK',
  'United Arab Emirates': 'AE',
  'United States Of America': 'US',
  Zimbabwe: 'ZW',
};
export function CountryFlag({ country }: { country: string | null }) {
  const name = country ?? 'Nationality unavailable';
  const code = codes[name];
  return (
    <span className="country-flag" role="img" aria-label={name} title={name} tabIndex={0}>
      {name === 'West Indies' ? (
        <svg width="22" height="15" viewBox="0 0 44 30" aria-hidden="true">
          <rect width="44" height="30" rx="2" fill="#7b183d" />
          <circle cx="22" cy="15" r="10" fill="#f6ce65" />
          <path
            d="M14 22h16M22 21l2-12m0 1q-8-7-12 1m12-1q8-6 11 2m-11-2q-2-8-7-6m7 6q3-8 7-5"
            fill="none"
            stroke="#25734a"
            strokeWidth="2"
          />
        </svg>
      ) : code ? (
        <img src={`/flags/${code.toLowerCase()}.svg`} width="22" height="16" alt="" />
      ) : (
        <span aria-hidden="true">—</span>
      )}
    </span>
  );
}
