import type { Locale } from './types'
import { districtName } from './districts-en'

const TYPE_EN: Record<string, string> = {
  'ทางเท้า': 'Sidewalk',
  'ถนน': 'Road',
  'อื่นๆ': 'Other',
  'ผิดกฎจราจร': 'Traffic violation',
  'ไฟฟ้า': 'Electricity',
  'ความสะอาด': 'Cleanliness',
  'อุปกรณ์ชำรุด': 'Damaged equipment',
  'ความปลอดภัย': 'Safety',
  'จราจร': 'Traffic',
  'อาคารสถานที่ชำรุด': 'Damaged public facility',
  'สัตว์': 'Animals',
  'ท่อระบายน้ำ': 'Drainage',
  'เสียง': 'Noise',
  'น้ำท่วม': 'Flooding',
  'ต้นไม้': 'Trees',
  'หาบเร่แผงลอย': 'Street vendors',
  'ประปา': 'Water supply',
  'ข้อเสนอแนะ': 'Suggestion',
  'ป้ายโฆษณา': 'Advertising sign',
  'ขึ้นทะเบียน&สำรวจ': 'Registration & survey',
  'ฝุ่นควัน&กลิ่น&PM2.5': 'Dust, odor & PM2.5',
  'เหตุเดือดร้อนรำคาญ': 'Public nuisance',
  'ต้นไม้และสวนสาธารณะ': 'Trees and parks',
  'กระทำผิดในที่สาธารณะ': 'Public space violations',
  'ปัญหาที่ส่งผลกระทบกับการจราจร': 'Traffic-impacting issue',
  'สาธารณูปโภค': 'Utilities',
  'บาทวิถี': 'Footpath',
  'BEST': 'BEST',
}

export function problemTypeLabel(label: string, lang: Locale): string {
  if (lang !== 'en') return label
  if (TYPE_EN[label]) return TYPE_EN[label]

  if (label.includes('->')) {
    return label
      .split('->')
      .map((part) => TYPE_EN[part.trim()] ?? part.trim())
      .join(' > ')
  }

  return label
}

const DEPARTMENT_EN: Record<string, string> = {
  'ฝ่ายเทศกิจ': 'Municipal Law Enforcement',
  'ฝ่ายโยธา': 'Public Works',
  'ฝ่ายรักษาความสะอาดและสวนสาธารณะ': 'Sanitation and Parks',
  'ฝ่ายสิ่งแวดล้อมและสุขาภิบาล': 'Environment and Sanitation',
  'ฝ่ายการโยธา': 'Public Works',
  'ฝ่ายรายได้': 'Revenue',
  'ฝ่ายทะเบียน': 'Registration',
  'ฝ่ายปกครอง': 'Administration',
  'ฝ่ายพัฒนาชุมชนและสวัสดิการสังคม': 'Community Development and Social Welfare',
}

function translateSegment(seg: string): string {
  const s = seg.trim()

  if (s === 'กรุงเทพมหานคร') return 'Bangkok Metropolitan Administration'

  const districtOnly = s.match(/^เขต(.+)$/)
  if (districtOnly) {
    return `${districtName(districtOnly[1], 'en')} District`
  }

  const deptDistrict = s.match(/^(.+)\sเขต(.+)$/)
  if (deptDistrict) {
    const dept = DEPARTMENT_EN[deptDistrict[1]] ?? deptDistrict[1]
    const dist = districtName(deptDistrict[2], 'en')
    return `${dept}, ${dist} District`
  }

  return s
}

export function organizationLabel(label: string, lang: Locale): string {
  if (lang !== 'en') return label
  if (!label.includes(',')) return translateSegment(label)
  return label
    .split(',')
    .map(translateSegment)
    .join(', ')
}
