'use client'
import { useEffect, useRef } from 'react'
import * as d3 from 'd3'
import { useRouter } from 'next/navigation'
import type { LifeArea } from '@/lib/types'

export type AreaScore = {
  area: LifeArea
  lifetimeScore: number
  recentScore: number
}

type ArcDatum = { outerRadius: number; startAngle: number; endAngle: number }

export default function WindRose({ scores }: { scores: AreaScore[] }) {
  const ref = useRef<SVGSVGElement>(null)
  const router = useRouter()

  useEffect(() => {
    const el = ref.current
    if (!el || scores.length === 0) return
    const { width, height } = el.getBoundingClientRect()
    if (width === 0 || height === 0) return

    const cx = width / 2
    const cy = height / 2
    const maxRadius = Math.min(cx, cy) * 0.68
    const n = scores.length
    const angleStep = (2 * Math.PI) / n
    const petalHalfWidth = Math.min(angleStep * 0.42, 0.38)
    const maxLifetime = Math.max(1, ...scores.map(s => s.lifetimeScore))
    const MIN_R = 48

    const svg = d3.select(el)
    svg.selectAll('*').remove()

    // Glow filter
    const defs = svg.append('defs')
    const filt = defs.append('filter')
      .attr('id', 'petal-glow')
      .attr('x', '-60%').attr('y', '-60%')
      .attr('width', '220%').attr('height', '220%')
    filt.append('feGaussianBlur')
      .attr('in', 'SourceGraphic').attr('stdDeviation', '10').attr('result', 'blur')
    const merge = filt.append('feMerge')
    merge.append('feMergeNode').attr('in', 'blur')
    merge.append('feMergeNode').attr('in', 'blur')
    merge.append('feMergeNode').attr('in', 'SourceGraphic')

    // Subtle background rings
    ;[0.33, 0.66, 1].forEach(t => {
      svg.append('circle').attr('cx', cx).attr('cy', cy)
        .attr('r', maxRadius * t)
        .attr('fill', 'none')
        .attr('stroke', '#1a1a30')
        .attr('stroke-width', 1)
    })

    const arcGen = d3.arc<ArcDatum>()
      .innerRadius(6)
      .outerRadius(d => d.outerRadius)
      .startAngle(d => d.startAngle)
      .endAngle(d => d.endAngle)
      .cornerRadius(3)

    scores.forEach((s, i) => {
      const angle = i * angleStep
      const startAngle = angle - petalHalfWidth
      const endAngle = angle + petalHalfWidth
      const r = MIN_R + (s.lifetimeScore / maxLifetime) * (maxRadius - MIN_R)
      const recentOpacity = Math.min(s.recentScore / 8, 1)

      const g = svg.append('g')
        .attr('transform', `translate(${cx},${cy})`)
        .style('cursor', 'pointer')
        .on('click', () => router.push(`/dashboard/tasks?area=${s.area.id}`))

      if (recentOpacity > 0.05) {
        g.append('path')
          .datum({ outerRadius: r, startAngle, endAngle })
          .attr('d', arcGen)
          .attr('fill', s.area.color)
          .attr('opacity', recentOpacity * 0.6)
          .attr('filter', 'url(#petal-glow)')
      }

      const petal = g.append('path')
        .datum({ outerRadius: r, startAngle, endAngle })
        .attr('d', arcGen)
        .attr('fill', s.area.color)
        .attr('opacity', 0.3)

      petal
        .on('mouseenter', function() { d3.select(this).attr('opacity', 0.55) })
        .on('mouseleave', function() { d3.select(this).attr('opacity', 0.3) })

      // Tip dot
      const tipX = Math.sin(angle) * (r + 4)
      const tipY = -Math.cos(angle) * (r + 4)
      g.append('circle').attr('cx', tipX).attr('cy', tipY)
        .attr('r', 2.5).attr('fill', s.area.color).attr('opacity', 0.75)

      // Label
      const labelR = r + (r < 80 ? 22 : 26)
      const labelX = Math.sin(angle) * labelR
      const labelY = -Math.cos(angle) * labelR
      g.append('text')
        .attr('x', labelX).attr('y', labelY)
        .attr('text-anchor', 'middle').attr('dominant-baseline', 'middle')
        .attr('font-size', '11').attr('fill', '#625f7a')
        .style('pointer-events', 'none')
        .text(`${s.area.icon} ${s.area.name}`)
    })

    // Center dot
    svg.append('circle').attr('cx', cx).attr('cy', cy)
      .attr('r', 5).attr('fill', '#272745')

  }, [scores, router])

  return <svg ref={ref} className="w-full h-full" />
}
