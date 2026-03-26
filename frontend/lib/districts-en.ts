import type { Locale } from './types'

/** Official BMA English transliterations for all 50 Bangkok districts */
export const DISTRICT_EN: Record<string, string> = {
  'พระนคร': 'Phra Nakhon',
  'ดุสิต': 'Dusit',
  'หนองจอก': 'Nong Chok',
  'บางรัก': 'Bang Rak',
  'บางเขน': 'Bang Khen',
  'ลาดกระบัง': 'Lat Krabang',
  'ยานนาวา': 'Yan Nawa',
  'สัมพันธวงศ์': 'Samphanthawong',
  'พระโขนง': 'Phra Khanong',
  'มีนบุรี': 'Min Buri',
  'ลาดพร้าว': 'Lat Phrao',
  'วังทองหลาง': 'Wang Thonglang',
  'คลองสาน': 'Khlong San',
  'ตลิ่งชัน': 'Taling Chan',
  'บางกอกน้อย': 'Bangkok Noi',
  'บางขุนเทียน': 'Bang Khun Thian',
  'ภาษีเจริญ': 'Phasi Charoen',
  'หนองแขม': 'Nong Khaem',
  'ราษฎร์บูรณะ': 'Rat Burana',
  'หลักสี่': 'Lak Si',
  'คลองเตย': 'Khlong Toei',
  'สวนหลวง': 'Suan Luang',
  'จอมทอง': 'Chom Thong',
  'ดอนเมือง': 'Don Mueang',
  'ราชเทวี': 'Ratchathewi',
  'บึงกุ่ม': 'Bueng Kum',
  'สาทร': 'Sathon',
  'บางซื่อ': 'Bang Sue',
  'จตุจักร': 'Chatuchak',
  'ดินแดง': 'Din Daeng',
  'บางกอกใหญ่': 'Bangkok Yai',
  'ห้วยขวาง': 'Huai Khwang',
  'คลองสามวา': 'Khlong Sam Wa',
  'บางนา': 'Bang Na',
  'ทวีวัฒนา': 'Thawi Watthana',
  'ทุ่งครุ': 'Thung Khru',
  'บางบอน': 'Bang Bon',
  'ประเวศ': 'Prawet',
  'สะพานสูง': 'Saphan Sung',
  'ป้อมปราบศัตรูพ่าย': 'Pom Prap Sattru Phai',
  'พญาไท': 'Phaya Thai',
  'ธนบุรี': 'Thon Buri',
  'บางกะปิ': 'Bang Kapi',
  'วัฒนา': 'Watthana',
  'บางพลัด': 'Bang Phlat',
  'คันนายาว': 'Khan Na Yao',
  'สายไหม': 'Sai Mai',
  'ปทุมวัน': 'Pathum Wan',
  'บางแค': 'Bang Khae',
  'บางคอแหลม': 'Bang Kho Laem',
}

/** Returns the district display name for the given locale */
export function districtName(thName: string, lang: Locale): string {
  if (lang === 'en') return DISTRICT_EN[thName] ?? thName
  return thName
}

const TH_MONTHS = [
  'ม.ค.', 'ก.พ.', 'มี.ค.', 'เม.ย.', 'พ.ค.', 'มิ.ย.',
  'ก.ค.', 'ส.ค.', 'ก.ย.', 'ต.ค.', 'พ.ย.', 'ธ.ค.',
]

/**
 * Format an ISO date string (YYYY-MM-DD) for display.
 * TH: Buddhist Era — "19 ก.ย. 2564"
 * EN: Common Era  — "Sep 19, 2021"
 */
export function formatDate(isoDate: string, lang: Locale): string {
  const [y, m, d] = isoDate.split('-').map(Number)
  if (lang === 'th') {
    return `${d} ${TH_MONTHS[m - 1]} ${y + 543}`
  }
  const date = new Date(Date.UTC(y, m - 1, d))
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
}
