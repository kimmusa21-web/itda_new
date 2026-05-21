import React from 'react'
import { renderToBuffer } from '@react-pdf/renderer'
import { UserManualPdf } from '../lib/pdf/user-manual'
import fs from 'fs'
import path from 'path'

async function main() {
  console.log('PDF 생성 중...')
  const buffer = await renderToBuffer(React.createElement(UserManualPdf) as React.ReactElement)
  const outPath = path.join(process.cwd(), 'public', 'ModuHR_사용설명서.pdf')
  fs.writeFileSync(outPath, buffer)
  console.log('완료:', outPath)
}

main().catch(err => { console.error(err); process.exit(1) })
