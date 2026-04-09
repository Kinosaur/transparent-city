import { ImageResponse } from 'next/og'
import { NextRequest } from 'next/server'

export const dynamic = 'force-dynamic'

// ─── Grade colors matching the app's design system ────────────────────────────
const GRADE_COLORS: Record<string, { bg: string; text: string }> = {
  A: { bg: '#4ade80', text: '#052e16' },
  B: { bg: '#86efac', text: '#052e16' },
  C: { bg: '#fbbf24', text: '#1c1917' },
  D: { bg: '#fb923c', text: '#1c1917' },
  F: { bg: '#f87171', text: '#1c1917' },
}

// ─── Per-page copy ─────────────────────────────────────────────────────────────
const PAGE: Record<string, { en: string; th: string; sub_en: string; sub_th: string }> = {
  overview: {
    en: 'Bangkok Overview',
    th: 'ภาพรวมกรุงเทพฯ',
    sub_en: 'Real-time KPIs, monthly trends & top problem types',
    sub_th: 'สถิติเรียลไทม์ แนวโน้มรายเดือน และประเภทปัญหา',
  },
  districts: {
    en: 'District Report Card',
    th: 'ผลงานเขต',
    sub_en: 'A–F grades for every Bangkok district',
    sub_th: 'เกรด A–F สำหรับทุกเขตในกรุงเทพฯ',
  },
  leaderboard: {
    en: 'Agency Leaderboard',
    th: 'จัดอันดับหน่วยงาน',
    sub_en: 'Who resolves civic tickets fastest?',
    sub_th: 'หน่วยงานใดแก้ไขปัญหาได้เร็วที่สุด?',
  },
  gallery: {
    en: 'Before & After Gallery',
    th: 'ก่อน–หลัง',
    sub_en: 'Visual proof of problems solved across Bangkok',
    sub_th: 'หลักฐานภาพการแก้ไขปัญหาทั่วกรุงเทพฯ',
  },
  map: {
    en: 'Civic Ticket Map',
    th: 'แผนที่สำรวจ',
    sub_en: "Where are Bangkok's stale & low-rated tickets?",
    sub_th: 'ตั๋วค้างคาและได้คะแนนต่ำอยู่ที่ไหนบ้าง?',
  },
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)

  const page    = searchParams.get('page') ?? 'overview'
  const lang    = searchParams.get('lang') ?? 'en'
  const district = searchParams.get('district')   // e.g. "Chatuchak"
  const grade   = searchParams.get('grade')       // e.g. "A"
  const resolution = searchParams.get('resolution') // e.g. "85.2"
  const stale   = searchParams.get('stale')       // e.g. "8.3"
  const tickets = searchParams.get('tickets')     // e.g. "63224"

  const isEN = lang !== 'th'
  const info = PAGE[page] ?? PAGE.overview
  const gradeStyle = grade ? (GRADE_COLORS[grade] ?? GRADE_COLORS.B) : null
  const isDistrictCard = page === 'districts' && district && grade

  return new ImageResponse(
    (
      <div
        style={{
          width: '1200px',
          height: '630px',
          background: 'linear-gradient(135deg, #0c0c1a 0%, #14142a 60%, #0c0c1a 100%)',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          padding: '56px 64px',
          fontFamily: 'ui-sans-serif, system-ui, sans-serif',
          position: 'relative',
        }}
      >
        {/* Subtle top-right glow */}
        <div style={{
          position: 'absolute',
          top: '-80px',
          right: '-80px',
          width: '400px',
          height: '400px',
          borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(45,212,191,0.08) 0%, transparent 70%)',
          display: 'flex',
        }} />

        {/* Header row */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#2dd4bf' }} />
          <span style={{ color: '#2dd4bf', fontSize: '17px', fontWeight: 600, letterSpacing: '2px' }}>
            TRANSPARENT CITY BANGKOK · เมืองโปร่งใส
          </span>
        </div>

        {/* Main content */}
        {isDistrictCard ? (
          // ── District card ──────────────────────────────────────────────────
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0px' }}>
            <span style={{ color: '#7070a0', fontSize: '20px', marginBottom: '16px' }}>
              {isEN ? 'District Report Card' : 'ผลงานเขต'}
            </span>

            <div style={{ display: 'flex', alignItems: 'center', gap: '28px', marginBottom: '32px' }}>
              {/* Grade badge */}
              <div style={{
                background: gradeStyle!.bg,
                color: gradeStyle!.text,
                fontSize: '80px',
                fontWeight: 900,
                width: '130px',
                height: '130px',
                borderRadius: '20px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                flexShrink: 0,
              }}>
                {grade}
              </div>

              {/* District name */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <span style={{ color: '#d8d8f0', fontSize: '62px', fontWeight: 800, lineHeight: 1 }}>
                  {district}
                </span>
                {tickets && (
                  <span style={{ color: '#7070a0', fontSize: '20px' }}>
                    {parseInt(tickets).toLocaleString()} {isEN ? 'tickets total' : 'ตั๋วทั้งหมด'}
                  </span>
                )}
              </div>
            </div>

            {/* Stats row */}
            <div style={{ display: 'flex', gap: '48px' }}>
              {resolution && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ color: '#7070a0', fontSize: '15px', letterSpacing: '1px' }}>
                    {isEN ? 'RESOLUTION RATE' : 'อัตราการแก้ไข'}
                  </span>
                  <span style={{ color: '#4ade80', fontSize: '38px', fontWeight: 700 }}>
                    {parseFloat(resolution).toFixed(1)}%
                  </span>
                </div>
              )}
              {stale && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <span style={{ color: '#7070a0', fontSize: '15px', letterSpacing: '1px' }}>
                    {isEN ? 'STALE RATE' : 'อัตราค้างคา'}
                  </span>
                  <span style={{ color: '#fbbf24', fontSize: '38px', fontWeight: 700 }}>
                    {parseFloat(stale).toFixed(1)}%
                  </span>
                </div>
              )}
            </div>
          </div>
        ) : (
          // ── Generic page card ──────────────────────────────────────────────
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <span style={{ color: '#7070a0', fontSize: '22px' }}>
              {isEN ? 'Community Civic Transparency Platform' : 'แพลตฟอร์มความโปร่งใสภาคประชาชน'}
            </span>
            <span style={{ color: '#d8d8f0', fontSize: '68px', fontWeight: 800, lineHeight: 1.1 }}>
              {isEN ? info.en : info.th}
            </span>
            <span style={{ color: '#9090b8', fontSize: '26px', marginTop: '4px' }}>
              {isEN ? info.sub_en : info.sub_th}
            </span>
          </div>
        )}

        {/* Footer row */}
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <span style={{ color: '#505070', fontSize: '16px' }}>
            Data: Traffy Fondue · traffy.in.th
          </span>
          <div style={{
            background: 'rgba(45,212,191,0.12)',
            border: '1px solid rgba(45,212,191,0.25)',
            borderRadius: '8px',
            padding: '6px 16px',
            display: 'flex',
            alignItems: 'center',
          }}>
            <span style={{ color: '#2dd4bf', fontSize: '16px', fontWeight: 500 }}>
              transparent-city.vercel.app
            </span>
          </div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 }
  )
}
