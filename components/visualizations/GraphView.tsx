'use client'
import { useEffect, useRef, useState, useMemo } from 'react'
import { useSearchParams } from 'next/navigation'
import * as d3 from 'd3'
import { createClient } from '@/lib/supabase/client'

type NodeDatum = d3.SimulationNodeDatum & {
  id: string; label: string; type: 'area' | 'project' | 'task'
  color: string; status?: string; due_date?: string | null
}
type LinkDatum = { source: string; target: string }

type DetailPanel = { label: string; type: string; status?: string; due_date?: string | null }

export default function GraphView() {
  const svgRef = useRef<SVGSVGElement>(null)
  const supabase = useMemo(() => createClient(), [])
  const [detail, setDetail] = useState<DetailPanel | null>(null)
  const selectedAreaId = useSearchParams().get('area')

  useEffect(() => {
    async function load() {
      const { data: areas, error: areasError } = await supabase.from('life_areas').select('*')
      if (areasError) { console.error('Failed to load life areas:', areasError); return }

      const { data: projects, error: projectsError } = await supabase.from('projects').select('*')
      if (projectsError) { console.error('Failed to load projects:', projectsError); return }

      const { data: tasks, error: tasksError } = await supabase.from('tasks').select('id, project_id, name, status, due_date')
      if (tasksError) { console.error('Failed to load tasks:', tasksError); return }

      const areaMap = Object.fromEntries(areas.map(a => [a.id, a]))
      const projectMap = Object.fromEntries((projects ?? []).map(p => [p.id, p]))

      const filteredAreas = selectedAreaId ? areas.filter(a => a.id === selectedAreaId) : areas
      const filteredAreaIds = new Set(filteredAreas.map(a => a.id))
      const filteredProjects = (projects ?? []).filter(p => filteredAreaIds.has(p.life_area_id))
      const filteredProjectIds = new Set(filteredProjects.map(p => p.id))
      const filteredTasks = (tasks ?? []).filter(t => filteredProjectIds.has(t.project_id))

      const nodes: NodeDatum[] = [
        ...filteredAreas.map(a => ({ id: a.id, label: `${a.icon} ${a.name}`, type: 'area' as const, color: a.color })),
        ...filteredProjects.map(p => ({ id: p.id, label: p.name, type: 'project' as const, color: areaMap[p.life_area_id]?.color ?? '#6366f1', status: p.status })),
        ...filteredTasks.map(t => ({ id: t.id, label: t.name, type: 'task' as const, color: areaMap[projectMap[t.project_id]?.life_area_id]?.color ?? '#6366f1', status: t.status, due_date: t.due_date })),
      ]

      const links: LinkDatum[] = [
        ...filteredProjects.map(p => ({ source: p.life_area_id, target: p.id })),
        ...filteredTasks.map(t => ({ source: t.project_id, target: t.id })),
      ]

      renderGraph(nodes, links)
    }

    function renderGraph(nodes: NodeDatum[], links: LinkDatum[]) {
      const el = svgRef.current
      if (!el) return
      const { width, height } = el.getBoundingClientRect()
      d3.select(el).selectAll('*').remove()

      const svg = d3.select(el)
      const g = svg.append('g')

      svg.call(d3.zoom<SVGSVGElement, unknown>().scaleExtent([0.2, 3]).on('zoom', e => g.attr('transform', e.transform)) as unknown as (selection: d3.Selection<SVGSVGElement, unknown, null, undefined>) => void)

      const sim = d3.forceSimulation(nodes)
        .force('link', d3.forceLink(links).id((d: d3.SimulationNodeDatum) => (d as NodeDatum).id).distance((d: d3.SimulationLinkDatum<NodeDatum>) => {
          const s = d.source as NodeDatum
          return s.type === 'area' ? 120 : 80
        }))
        .force('charge', d3.forceManyBody().strength(-200))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('collision', d3.forceCollide().radius((d: d3.SimulationNodeDatum) => nodeRadius(d as NodeDatum) + 4))

      const link = g.append('g').selectAll('line').data(links).enter().append('line')
        .attr('stroke', '#374151').attr('stroke-width', 1.5).attr('stroke-opacity', 0.6)

      const node = g.append('g').selectAll('circle').data(nodes).enter().append('circle')
        .attr('r', (d: NodeDatum) => nodeRadius(d))
        .attr('fill', (d: NodeDatum) => d.color)
        .attr('fill-opacity', (d: NodeDatum) => d.status === 'done' ? 0.3 : 0.85)
        .attr('stroke', '#111827').attr('stroke-width', 2)
        .style('cursor', 'pointer')
        .on('click', (_, d: NodeDatum) => setDetail({ label: d.label, type: d.type, status: d.status, due_date: d.due_date }))
        .call(d3.drag<SVGCircleElement, NodeDatum>()
          .on('start', (e, d) => { if (!e.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y })
          .on('drag', (e, d) => { d.fx = e.x; d.fy = e.y })
          .on('end', (e, d) => { if (!e.active) sim.alphaTarget(0); d.fx = null; d.fy = null }) as unknown as (selection: d3.Selection<SVGCircleElement, NodeDatum, SVGGElement, unknown>) => void)

      const label = g.append('g').selectAll('text').data(nodes.filter(d => d.type !== 'task')).enter().append('text')
        .text((d: NodeDatum) => d.label)
        .attr('font-size', (d: NodeDatum) => d.type === 'area' ? 13 : 10)
        .attr('fill', '#e5e7eb').attr('text-anchor', 'middle').attr('dy', (d: NodeDatum) => -nodeRadius(d) - 4)
        .style('pointer-events', 'none')

      sim.on('tick', () => {
        link
          .attr('x1', (d: d3.SimulationLinkDatum<NodeDatum>) => (d.source as NodeDatum).x ?? 0)
          .attr('y1', (d: d3.SimulationLinkDatum<NodeDatum>) => (d.source as NodeDatum).y ?? 0)
          .attr('x2', (d: d3.SimulationLinkDatum<NodeDatum>) => (d.target as NodeDatum).x ?? 0)
          .attr('y2', (d: d3.SimulationLinkDatum<NodeDatum>) => (d.target as NodeDatum).y ?? 0)
        node.attr('cx', (d: NodeDatum) => d.x ?? 0).attr('cy', (d: NodeDatum) => d.y ?? 0)
        label.attr('x', (d: NodeDatum) => d.x ?? 0).attr('y', (d: NodeDatum) => d.y ?? 0)
      })
    }

    function nodeRadius(d: NodeDatum) {
      return d.type === 'area' ? 22 : d.type === 'project' ? 14 : 8
    }

    load()
  }, [supabase, selectedAreaId])

  return (
    <div className="relative w-full" style={{ height: 'calc(100vh - 120px)' }}>
      <h1 className="absolute top-0 left-0 text-xl font-bold text-white z-10">Mind Map</h1>
      <p className="absolute top-8 left-0 text-xs text-gray-600 z-10">Drag nodes · scroll to zoom · click for details</p>
      <svg ref={svgRef} className="w-full h-full" />

      {detail && (
        <div className="absolute top-4 right-4 bg-gray-900 border border-gray-700 rounded-xl p-4 w-52 shadow-xl">
          <button onClick={() => setDetail(null)} className="absolute top-2 right-3 text-gray-600 hover:text-gray-400">×</button>
          <p className="text-xs text-gray-500 uppercase mb-1">{detail.type}</p>
          <p className="text-sm font-semibold text-white mb-2">{detail.label}</p>
          {detail.status && <p className="text-xs text-gray-400">Status: <span className="text-gray-200">{detail.status}</span></p>}
          {detail.due_date && <p className="text-xs text-gray-400 mt-1">Due: <span className="text-gray-200">{detail.due_date}</span></p>}
        </div>
      )}
    </div>
  )
}
