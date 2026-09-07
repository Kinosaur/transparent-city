import type { Metadata } from 'next'
import Link from 'next/link'
import { notFound } from 'next/navigation'
import fs from 'fs'
import path from 'path'
import { getDictionary, hasLocale } from '../dictionaries'
import { formatDate } from '@/lib/districts-en'
import type { OverviewData } from '@/lib/types'

type Copy = {
  eyebrow: string
  title: string
  intro: string
  dataLabel: string
  sourceLabel: string
  sourceValue: string
  coverageLabel: string
  coverageValue: string
  volumeLabel: string
  publishedLabel: string
  publishedValue: string
  readTitle: string
  readIntro: string
  rules: Array<{ number: string; title: string; body: string }>
  limitsTitle: string
  limits: string[]
  participateTitle: string
  participateBody: string
  contribute: string
  browseCode: string
  back: string
}

const copy: Record<'en' | 'th', Copy> = {
  en: {
    eyebrow: 'Evidence ledger',
    title: 'Methods & data notes',
    intro: 'Transparent City turns public civic-report data into readable signals. This page explains what is counted, what is not, and how to challenge or improve the work.',
    dataLabel: 'Data source',
    sourceLabel: 'Primary source',
    sourceValue: 'Traffy Fondue public data for Bangkok',
    coverageLabel: 'Published coverage',
    coverageValue: 'Complaint reports in the published snapshot',
    volumeLabel: 'Reports in this release',
    publishedLabel: 'Latest report date',
    publishedValue: 'Manual, validated publication',
    readTitle: 'Read the numbers with care',
    readIntro: 'The dashboard is a community interpretation of the source data, not an official performance report. A number can be useful without being the whole story.',
    rules: [
      { number: '01', title: 'We use published records', body: 'The dashboard is generated from publicly available Traffy Fondue exports. We do not accept private resident reports or infer missing records.' },
      { number: '02', title: '“Resolved” follows the source status', body: 'A ticket is counted as resolved when the source marks it resolved. It does not independently verify the quality or permanence of the repair.' },
      { number: '03', title: '“Stale” means 90+ inactive days', body: 'An unresolved ticket is flagged stale after at least 90 days without resolution. It is a prompt for attention, not proof of neglect.' },
      { number: '04', title: 'Grades compare districts', body: 'District grades are percentile-based comparisons across Bangkok. They are not official grades and should never be used as a complete measure of a district.' },
      { number: '05', title: 'Rankings show routing strings', body: 'Leaderboard rows currently reflect the organization-routing text supplied by the source. A row can contain several bodies, so it must not be read as a clean single-agency verdict.' },
      { number: '06', title: 'Recent months are still maturing', body: 'Recent reports have had less time to be resolved, so month-to-month resolution rates should be compared carefully. We keep historical coverage visible rather than hiding uncertainty.' },
    ],
    limitsTitle: 'Known limits',
    limits: [
      'One source month, November 2021, is unavailable upstream and is not invented or backfilled.',
      'Photos, categories, locations, and organization names are only as complete as the source record.',
      'A ticket’s route may involve more than one public body; responsibility cannot be assigned from the routing text alone.',
      'This project is independent and is not affiliated with or endorsed by the Bangkok Metropolitan Administration or Traffy Fondue.',
    ],
    participateTitle: 'Help make this useful',
    participateBody: 'Found an issue in the interface, an unclear definition, or a better way to interpret the data? Open an issue. Constructive, evidence-backed contributions are welcome.',
    contribute: 'Suggest an improvement',
    browseCode: 'Browse the project code',
    back: 'Explore the dashboard',
  },
  th: {
    eyebrow: 'สมุดบันทึกหลักฐาน',
    title: 'วิธีการและบันทึกข้อมูล',
    intro: 'เมืองโปร่งใสเปลี่ยนข้อมูลแจ้งปัญหาสาธารณะให้เป็นข้อมูลที่อ่านง่าย หน้านี้อธิบายสิ่งที่นับ สิ่งที่ยังนับไม่ได้ และวิธีช่วยตรวจสอบหรือพัฒนาโครงการ',
    dataLabel: 'ที่มาของข้อมูล',
    sourceLabel: 'แหล่งข้อมูลหลัก',
    sourceValue: 'ข้อมูลสาธารณะ Traffy Fondue สำหรับกรุงเทพมหานคร',
    coverageLabel: 'ขอบเขตข้อมูลที่เผยแพร่',
    coverageValue: 'รายการแจ้งปัญหาในชุดข้อมูลที่เผยแพร่',
    volumeLabel: 'รายการในรุ่นนี้',
    publishedLabel: 'วันที่รายงานล่าสุด',
    publishedValue: 'เผยแพร่ด้วยการตรวจสอบแบบแมนนวล',
    readTitle: 'อ่านตัวเลขอย่างรอบคอบ',
    readIntro: 'แดชบอร์ดนี้เป็นการตีความข้อมูลโดยชุมชน ไม่ใช่รายงานผลงานอย่างเป็นทางการ ตัวเลขมีประโยชน์ได้ แต่ไม่ใช่เรื่องราวทั้งหมด',
    rules: [
      { number: '01', title: 'ใช้ข้อมูลที่เผยแพร่แล้ว', body: 'แดชบอร์ดสร้างจากข้อมูลส่งออก Traffy Fondue ที่สาธารณะ เราไม่รับเรื่องร้องเรียนส่วนตัว และไม่เดาข้อมูลที่ขาดหาย' },
      { number: '02', title: '“แก้ไขแล้ว” ตามสถานะต้นทาง', body: 'ตั๋วจะถูกนับว่าแก้ไขแล้วเมื่อแหล่งข้อมูลระบุเช่นนั้น โครงการไม่ได้ตรวจสอบคุณภาพหรือความยั่งยืนของการแก้ไขโดยอิสระ' },
      { number: '03', title: '“ค้างคา” คือไม่มีการแก้ไข 90+ วัน', body: 'ตั๋วที่ยังไม่แก้ไขจะถูกทำเครื่องหมายค้างคาเมื่อผ่านอย่างน้อย 90 วัน เป็นสัญญาณให้ติดตาม ไม่ใช่หลักฐานว่าละเลย' },
      { number: '04', title: 'เกรดใช้เทียบระหว่างเขต', body: 'เกรดของเขตมาจากลำดับเปอร์เซ็นไทล์เทียบกับทุกเขตของกรุงเทพฯ ไม่ใช่เกรดอย่างเป็นทางการ และไม่ควรใช้วัดผลงานทั้งหมดของเขต' },
      { number: '05', title: 'อันดับแสดงข้อความเส้นทางส่งเรื่อง', body: 'แถวในตารางอันดับใช้ข้อความเส้นทางหน่วยงานจากแหล่งข้อมูล หนึ่งแถวอาจมีหลายหน่วยงาน จึงไม่ควรอ่านเป็นคำตัดสินต่อหน่วยงานเดียว' },
      { number: '06', title: 'ข้อมูลเดือนล่าสุดยังไม่ครบวงจร', body: 'เรื่องที่รายงานใหม่มีเวลาถูกแก้ไขน้อยกว่า จึงควรเปรียบเทียบอัตราแก้ไขรายเดือนอย่างระมัดระวัง เราแสดงประวัติข้อมูลไว้แทนการซ่อนความไม่แน่นอน' },
    ],
    limitsTitle: 'ข้อจำกัดที่ทราบ',
    limits: [
      'ข้อมูลเดือนพฤศจิกายน 2021 ไม่พร้อมจากแหล่งต้นทาง จึงไม่สร้างหรือเติมข้อมูลแทน',
      'รูปภาพ ประเภท พิกัด และชื่อหน่วยงานสมบูรณ์ได้เท่ากับข้อมูลต้นทางเท่านั้น',
      'เส้นทางของตั๋วอาจเกี่ยวข้องกับหลายหน่วยงาน จึงไม่สามารถระบุผู้รับผิดชอบจากข้อความเส้นทางอย่างเดียว',
      'โครงการนี้เป็นอิสระ และไม่ได้สังกัดหรือได้รับการรับรองจากกรุงเทพมหานครหรือ Traffy Fondue',
    ],
    participateTitle: 'ช่วยทำให้โครงการมีประโยชน์ขึ้น',
    participateBody: 'พบปัญหาในหน้าเว็บ คำนิยามที่ไม่ชัดเจน หรือมีวิธีตีความข้อมูลที่ดีกว่า? เปิด issue ได้เลย เรายินดีรับข้อเสนอที่สร้างสรรค์และมีหลักฐาน',
    contribute: 'เสนอการปรับปรุง',
    browseCode: 'ดูโค้ดโครงการ',
    back: 'สำรวจแดชบอร์ด',
  },
}

function loadOverview(): OverviewData {
  const filePath = path.join(process.cwd(), 'public', 'data', 'overview.json')
  return JSON.parse(fs.readFileSync(filePath, 'utf-8'))
}

export async function generateMetadata({ params }: PageProps<'/[lang]'>): Promise<Metadata> {
  const { lang } = await params
  const isTh = lang === 'th'
  const title = isTh ? 'วิธีการและข้อมูล — เมืองโปร่งใส' : 'Methods & Data — Transparent City'
  const description = isTh
    ? 'ที่มา วิธีคำนวณ และข้อจำกัดของข้อมูลแจ้งปัญหากรุงเทพฯ บนเมืองโปร่งใส'
    : 'Source, calculations, and limitations behind Transparent City’s Bangkok civic-data dashboard.'

  return {
    title,
    description,
    alternates: { canonical: `/${lang}/methods`, languages: { th: '/th/methods', en: '/en/methods' } },
  }
}

export default async function MethodsPage({ params }: PageProps<'/[lang]'>) {
  const { lang } = await params
  if (!hasLocale(lang)) notFound()

  const [dict, overview] = await Promise.all([getDictionary(lang), Promise.resolve(loadOverview())])
  const t = copy[lang]

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10 sm:py-16">
      <div className="relative overflow-hidden rounded-3xl border border-[--color-border] bg-[--color-surface-900] px-6 py-10 sm:px-10 sm:py-14">
        <div className="absolute -right-16 -top-20 h-56 w-56 rounded-full bg-[--color-teal-400]/10 blur-3xl" aria-hidden />
        <div className="absolute -left-12 bottom-0 h-36 w-36 rounded-full bg-sky-400/10 blur-3xl" aria-hidden />
        <div className="relative max-w-3xl">
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[--color-teal-400]">{t.eyebrow}</p>
          <h1 className="mt-4 text-4xl sm:text-6xl font-bold tracking-[-0.045em] text-[--color-fg]">{t.title}</h1>
          <p className="mt-5 text-base sm:text-lg leading-8 text-[--color-subtle]">{t.intro}</p>
        </div>

        <div className="relative mt-10 grid grid-cols-1 sm:grid-cols-2 gap-px overflow-hidden rounded-2xl border border-[--color-border] bg-[--color-border]">
          {[
            [t.sourceLabel, t.sourceValue],
            [t.coverageLabel, t.coverageValue],
            [t.volumeLabel, overview.total_tickets.toLocaleString('en-US')],
            [t.publishedLabel, `${formatDate(overview.data_range.to, lang)} · ${t.publishedValue}`],
          ].map(([label, value]) => (
            <div key={label} className="bg-[--color-surface-900] px-5 py-5">
              <p className="text-xs uppercase tracking-wider text-[--color-muted]">{label}</p>
              <p className="mt-2 text-sm font-medium leading-6 text-[--color-fg]">{value}</p>
            </div>
          ))}
        </div>
      </div>

      <section className="mt-14">
        <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[--color-teal-400]">{t.dataLabel}</p>
        <h2 className="mt-3 text-3xl font-bold tracking-tight text-[--color-fg]">{t.readTitle}</h2>
        <p className="mt-3 max-w-3xl leading-7 text-[--color-subtle]">{t.readIntro}</p>

        <ol className="mt-8 divide-y divide-[--color-border] border-y border-[--color-border]">
          {t.rules.map((rule) => (
            <li key={rule.number} className="grid grid-cols-[3.25rem_1fr] gap-4 py-6 sm:grid-cols-[5rem_1fr] sm:gap-6">
              <span className="font-mono text-sm text-[--color-teal-400]">{rule.number}</span>
              <div>
                <h3 className="font-semibold text-[--color-fg]">{rule.title}</h3>
                <p className="mt-2 max-w-3xl leading-7 text-sm text-[--color-subtle]">{rule.body}</p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-14 grid grid-cols-1 lg:grid-cols-5 gap-6">
        <div className="lg:col-span-3 rounded-2xl border border-[--color-border] bg-[--color-surface-900] p-6 sm:p-8">
          <h2 className="text-2xl font-bold tracking-tight text-[--color-fg]">{t.limitsTitle}</h2>
          <ul className="mt-5 space-y-4">
            {t.limits.map((limit) => (
              <li key={limit} className="flex gap-3 text-sm leading-6 text-[--color-subtle]">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-[--color-warn]" aria-hidden />
                {limit}
              </li>
            ))}
          </ul>
        </div>

        <aside className="lg:col-span-2 rounded-2xl border border-[--color-teal-400]/25 bg-[--color-teal-400]/[0.07] p-6 sm:p-8">
          <h2 className="text-2xl font-bold tracking-tight text-[--color-fg]">{t.participateTitle}</h2>
          <p className="mt-4 text-sm leading-7 text-[--color-subtle]">{t.participateBody}</p>
          <div className="mt-6 flex flex-col gap-3">
            <a href="https://github.com/Kinosaur/transparent-city/issues" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center justify-center rounded-xl bg-[--color-teal-400] px-4 text-sm font-semibold text-[#061817] hover:brightness-110">
              {t.contribute}
            </a>
            <a href="https://github.com/Kinosaur/transparent-city" target="_blank" rel="noopener noreferrer" className="inline-flex min-h-11 items-center justify-center rounded-xl border border-[--color-border-hover] px-4 text-sm font-semibold text-[--color-fg] hover:bg-white/5">
              {t.browseCode}
            </a>
          </div>
        </aside>
      </section>

      <Link href={`/${lang}`} className="mt-10 inline-flex items-center gap-2 text-sm font-medium text-[--color-teal-400] hover:underline underline-offset-4">
        <span aria-hidden>←</span>{t.back}
      </Link>
      <p className="mt-8 text-xs text-[--color-muted]">{dict.footer.disclaimer}</p>
    </div>
  )
}
