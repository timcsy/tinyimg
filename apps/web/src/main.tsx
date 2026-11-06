import { TinyImgApp } from '@tinyimg/ui'
import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'

const target = document.getElementById('app')
if (!target) throw new Error('找不到 #app')
createRoot(target).render(
  <StrictMode>
    <TinyImgApp incoming={null} />
  </StrictMode>,
)
