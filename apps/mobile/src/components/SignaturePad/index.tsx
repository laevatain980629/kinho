import { useRef, useState, useEffect, useCallback } from 'react'
import { View, Text, Canvas } from '@tarojs/components'
import Taro from '@tarojs/taro'
import './index.scss'

interface SignaturePadProps {
  onDrawChange?: (hasDrawn: boolean) => void
}

export default function SignaturePad({ onDrawChange }: SignaturePadProps) {
  const canvasId = 'signature-canvas'
  const [hasDrawn, setHasDrawn] = useState(false)
  const ctxRef = useRef<any>(null)
  const drawingRef = useRef(false)

  useEffect(() => {
    initCanvas()
  }, [])

  const initCanvas = useCallback(() => {
    const query = Taro.createSelectorQuery()
    query.select(`#${canvasId}`).fields({ node: true, size: true }).exec((res: any) => {
      if (!res || !res[0] || !res[0].node) return
      const canvas = res[0].node
      const ctx = canvas.getContext('2d')

      const dpr = Taro.getSystemInfoSync().pixelRatio || 1
      const w = res[0].width
      const h = res[0].height

      canvas.width = w * dpr
      canvas.height = h * dpr
      ctx.scale(dpr, dpr)
      ctx.strokeStyle = '#000'
      ctx.lineWidth = 3
      ctx.lineCap = 'round'
      ctx.lineJoin = 'round'

      ctxRef.current = { ctx, canvas, w, h }
    })
  }, [])

  const getPoint = (e: any) => {
    const { ctx } = ctxRef.current || {}
    if (!ctx) return null
    const touch = e.touches?.[0] || e.changedTouches?.[0]
    if (!touch) return null
    return { x: touch.x, y: touch.y }
  }

  const handleTouchStart = (e: any) => {
    const point = getPoint(e)
    if (!point) return
    const { ctx } = ctxRef.current
    ctx.beginPath()
    ctx.moveTo(point.x, point.y)
    drawingRef.current = true
  }

  const handleTouchMove = (e: any) => {
    if (!drawingRef.current) return
    const point = getPoint(e)
    if (!point) return
    const { ctx } = ctxRef.current
    ctx.lineTo(point.x, point.y)
    ctx.stroke()
    if (!hasDrawn) {
      setHasDrawn(true)
      onDrawChange?.(true)
    }
  }

  const handleTouchEnd = () => {
    drawingRef.current = false
  }

  const handleClear = () => {
    const { ctx, w, h } = ctxRef.current || {}
    if (!ctx) return
    ctx.clearRect(0, 0, w, h)
    setHasDrawn(false)
    onDrawChange?.(false)
  }

  const toDataURL = useCallback((): Promise<string> => {
    return new Promise((resolve) => {
      const query = Taro.createSelectorQuery()
      query.select(`#${canvasId}`).fields({ node: true }).exec((res: any) => {
        if (!res || !res[0] || !res[0].node) {
          resolve('')
          return
        }
        try {
          const dataUrl = res[0].node.toDataURL('image/png')
          resolve(dataUrl)
        } catch {
          // Fallback for environments without toDataURL
          resolve('')
        }
      })
    })
  }, [])

  return (
    <View className='sig-pad'>
      <View className='sig-pad__canvas-wrap'>
        <Canvas
          id={canvasId}
          type='2d'
          className='sig-pad__canvas'
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        />
      </View>
      <View className='sig-pad__actions'>
        <View className='sig-pad__clear-btn' onClick={handleClear}>
          <Text className='sig-pad__clear-text'>清除</Text>
        </View>
      </View>
    </View>
  )
}
