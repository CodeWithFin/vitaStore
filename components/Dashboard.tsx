'use client'

import { useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import * as THREE from 'three'
import {
  Package,
  ArrowDownCircle,
  ArrowUpCircle,
  Plus,
  Edit3,
  Trash2,
  ArrowRight,
} from 'lucide-react'
import {
  getDashboardSummary,
  getItems,
  createItem,
  updateItem,
  deleteItem,
  stockIn,
  stockOut,
} from '@/lib/api'
import { supabase } from '@/lib/supabase'
import ItemModal from './ItemModal'
import TransactionModal from './TransactionModal'

export default function Dashboard() {
  const [summary, setSummary] = useState<any>(null)
  const [items, setItems] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [categoryFilter, setCategoryFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [showItemModal, setShowItemModal] = useState(false)
  const [showTransactionModal, setShowTransactionModal] = useState(false)
  const [transactionType, setTransactionType] = useState<'IN' | 'OUT' | null>(null)
  const [editingItem, setEditingItem] = useState<any>(null)
  
  const canvasRef = useRef<HTMLDivElement>(null)
  const sceneRef = useRef<any>(null)
  const router = useRouter()

  useEffect(() => {
    loadData()
  }, [])

  useEffect(() => {
    if (!loading && canvasRef.current && !sceneRef.current) {
      initThreeJS()
      return () => {
        if (sceneRef.current?.cleanup) {
          sceneRef.current.cleanup()
        }
      }
    }
  }, [loading])

  const loadData = async () => {
    try {
      setLoading(true)
      const [summaryRes, itemsRes] = await Promise.all([
        getDashboardSummary(),
        getItems(),
      ])
      setSummary(summaryRes)
      setItems(itemsRes)
    } catch (error) {
      console.error('Error loading data:', error)
    } finally {
      setLoading(false)
    }
  }

  const initThreeJS = () => {
    const container = canvasRef.current
    if (!container) return

    const scene = new THREE.Scene()
    scene.fog = new THREE.FogExp2(0xFDFCF8, 0.035)

    const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100)
    camera.position.set(0, 0, 18)

    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
    renderer.setSize(window.innerWidth, window.innerHeight)
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
    container.appendChild(renderer.domElement)

    const systemsGroup = new THREE.Group()
    systemsGroup.position.x = 4.0
    scene.add(systemsGroup)

    const geometry = new THREE.IcosahedronGeometry(4.5, 30)

    const uniforms = {
      uTime: { value: 0 },
      uDistortion: { value: 0.6 },
      uSize: { value: 2.5 },
      uColor: { value: new THREE.Color('#1C1917') },
      uOpacity: { value: 0.8 },
      uMouse: { value: new THREE.Vector2(0, 0) }
    }

    const vertexShader = `
      uniform float uTime;
      uniform float uDistortion;
      uniform float uSize;
      uniform vec2 uMouse;
      varying float vAlpha;
      varying vec3 vPos;
      varying float vNoise;
      vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
      vec4 permute(vec4 x) { return mod289(((x*34.0)+1.0)*x); }
      vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }
      float snoise(vec3 v) {
        const vec2 C = vec2(1.0/6.0, 1.0/3.0);
        const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
        vec3 i = floor(v + dot(v, C.yyy));
        vec3 x0 = v - i + dot(i, C.xxx);
        vec3 g = step(x0.yzx, x0.xyz);
        vec3 l = 1.0 - g;
        vec3 i1 = min(g.xyz, l.zxy);
        vec3 i2 = max(g.xyz, l.zxy);
        vec3 x1 = x0 - i1 + 1.0 * C.xxx;
        vec3 x2 = x0 - i2 + 2.0 * C.xxx;
        vec3 x3 = x0 - 1.0 + 3.0 * C.xxx;
        i = mod289(i);
        vec4 p = permute(permute(permute(i.z + vec4(0.0, i1.z, i2.z, 1.0)) + i.y + vec4(0.0, i1.y, i2.y, 1.0)) + i.x + vec4(0.0, i1.x, i2.x, 1.0));
        float n_ = 1.0/7.0;
        vec3 ns = n_ * D.wyz - D.xzx;
        vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
        vec4 x_ = floor(j * ns.z);
        vec4 y_ = floor(j - 7.0 * x_);
        vec4 x = x_ * ns.x + ns.yyyy;
        vec4 y = y_ * ns.x + ns.yyyy;
        vec4 h = 1.0 - abs(x) - abs(y);
        vec4 b0 = vec4(x.xy, y.xy);
        vec4 b1 = vec4(x.zw, y.zw);
        vec4 s0 = floor(b0)*2.0 + 1.0;
        vec4 s1 = floor(b1)*2.0 + 1.0;
        vec4 sh = -step(h, vec4(0.0));
        vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
        vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
        vec3 p0 = vec3(a0.xy, h.x);
        vec3 p1 = vec3(a0.zw, h.y);
        vec3 p2 = vec3(a1.xy, h.z);
        vec3 p3 = vec3(a1.zw, h.w);
        vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2, p2), dot(p3,p3)));
        p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
        vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
        m = m * m;
        return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
      }
      void main() {
        vec3 pos = position;
        float noiseFreq = 0.5;
        float noiseAmp = uDistortion;
        float noise = snoise(vec3(pos.x * noiseFreq + uTime * 0.1, pos.y * noiseFreq, pos.z * noiseFreq));
        vNoise = noise;
        vec3 newPos = pos + (normalize(pos) * noise * noiseAmp);
        float dist = distance(uMouse * 10.0, newPos.xy);
        float interaction = smoothstep(5.0, 0.0, dist);
        newPos += normalize(pos) * interaction * 0.5;
        vec4 mvPosition = modelViewMatrix * vec4(newPos, 1.0);
        gl_Position = projectionMatrix * mvPosition;
        gl_PointSize = uSize * (24.0 / -mvPosition.z) * (1.0 + noise * 0.5);
        vAlpha = 1.0;
        vPos = newPos;
      }
    `

    const fragmentShader = `
      uniform vec3 uColor;
      uniform float uOpacity;
      varying float vNoise;
      varying vec3 vPos;
      void main() {
        vec2 center = gl_PointCoord - vec2(0.5);
        float dist = length(center);
        if (dist > 0.5) discard;
        float alpha = smoothstep(0.5, 0.2, dist) * uOpacity;
        vec3 darkColor = uColor * 0.5;
        vec3 lightColor = uColor * 1.8;
        vec3 finalColor = mix(darkColor, lightColor, vNoise * 0.5 + 0.5);
        gl_FragColor = vec4(finalColor, alpha);
      }
    `

    const material = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: uniforms,
      transparent: true,
      depthWrite: false,
      blending: THREE.NormalBlending
    })

    const particles = new THREE.Points(geometry, material)
    systemsGroup.add(particles)

    const lineGroup = new THREE.Group()
    systemsGroup.add(lineGroup)

    function createThinOrbit(radius: number, rotation: { x: number; y: number }) {
      const curve = new THREE.EllipseCurve(0, 0, radius, radius, 0, 2 * Math.PI, false, 0)
      const points = curve.getPoints(128)
      const geo = new THREE.BufferGeometry().setFromPoints(points)
      const mat = new THREE.LineBasicMaterial({ color: 0x78350F, transparent: true, opacity: 0.15 })
      const orbit = new THREE.Line(geo, mat)
      orbit.rotation.x = rotation.x
      orbit.rotation.y = rotation.y
      lineGroup.add(orbit)
      return orbit
    }

    const orbits = [
      createThinOrbit(5.5, { x: Math.PI / 2, y: 0 }),
      createThinOrbit(5.2, { x: Math.PI / 3, y: Math.PI / 6 }),
      createThinOrbit(6.0, { x: Math.PI / 1.8, y: Math.PI / 4 })
    ]

    let time = 0
    let speed = 0.1
    let mouseX = 0, mouseY = 0

    const handleMouseMove = (e: MouseEvent) => {
      mouseX = (e.clientX / window.innerWidth) * 2 - 1
      mouseY = -(e.clientY / window.innerHeight) * 2 + 1
      uniforms.uMouse.value.x += (mouseX - uniforms.uMouse.value.x) * 0.05
      uniforms.uMouse.value.y += (mouseY - uniforms.uMouse.value.y) * 0.05
    }

    document.addEventListener('mousemove', handleMouseMove)

    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight
      camera.updateProjectionMatrix()
      renderer.setSize(window.innerWidth, window.innerHeight)
      if (window.innerWidth < 768) {
        systemsGroup.position.set(0, 1.5, -5)
        systemsGroup.scale.set(0.8, 0.8, 0.8)
      } else {
        systemsGroup.position.set(4.5, 0, 0)
        systemsGroup.scale.set(1, 1, 1)
      }
    }

    window.addEventListener('resize', handleResize)
    handleResize()

    const animate = () => {
      requestAnimationFrame(animate)
      time += 0.01 + (speed * 0.05)
      systemsGroup.rotation.y = time * 0.05
      systemsGroup.rotation.z = Math.sin(time * 0.1) * 0.05
      lineGroup.rotation.x = Math.sin(time * 0.05) * 0.2
      orbits.forEach((orbit, i) => {
        orbit.rotation.z += 0.002 * (i + 1)
      })
      camera.position.x += (mouseX * 0.5 - camera.position.x) * 0.05
      camera.position.y += (mouseY * 0.5 - camera.position.y) * 0.05
      camera.lookAt(0, 0, 0)
      uniforms.uTime.value = time
      renderer.render(scene, camera)
    }
    animate()

    sceneRef.current = {
      cleanup: () => {
        document.removeEventListener('mousemove', handleMouseMove)
        window.removeEventListener('resize', handleResize)
        renderer.dispose()
      }
    }
  }

  const handleItemSave = async (itemData: any) => {
    try {
      if (editingItem) {
        await updateItem(editingItem.id, itemData)
      } else {
        await createItem(itemData)
      }
      await loadData()
      setShowItemModal(false)
      setEditingItem(null)
    } catch (error: any) {
      alert(error.message || 'Error saving item')
    }
  }

  const handleItemDelete = async (id: number) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return
    try {
      await deleteItem(id)
      await loadData()
    } catch (error: any) {
      alert(error.message || 'Error deleting item')
    }
  }

  const handleTransaction = async (data: any) => {
    try {
      if (transactionType === 'IN') {
        await stockIn(data)
      } else {
        await stockOut(data)
      }
      await loadData()
      setShowTransactionModal(false)
      setTransactionType(null)
    } catch (error: any) {
      alert(error.message || 'Error processing transaction')
    }
  }

  const openStockIn = () => {
    setTransactionType('IN')
    setShowTransactionModal(true)
  }

  const openStockOut = () => {
    setTransactionType('OUT')
    setShowTransactionModal(true)
  }

  const openEditItem = (item: any) => {
    setEditingItem(item)
    setShowItemModal(true)
  }

  const filteredItems = items.filter((item) => {
    const matchesSearch =
      item.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      item.sku.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesCategory = !categoryFilter || item.category === categoryFilter
    const isLowStock = item.quantity <= item.min_stock
    const isOutOfStock = item.quantity === 0
    const status = isOutOfStock ? 'out' : isLowStock ? 'low' : 'ok'
    const matchesStatus = !statusFilter || status === statusFilter
    return matchesSearch && matchesCategory && matchesStatus
  })

  const categories = Array.from(new Set(items.map((item) => item.category).filter(Boolean)))

  const formatKES = (value: number) =>
    new Intl.NumberFormat('en-KE', {
      style: 'currency',
      currency: 'KES',
      maximumFractionDigits: 0,
    }).format(value || 0)

  if (loading || !summary) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-[#FDFCF8]">
        <div className="text-[#1C1917] font-serif">Loading...</div>
      </div>
    )
  }

  return (
    <div className="antialiased font-sans bg-[#FDFCF8] min-h-screen w-full overflow-x-hidden relative">
      {/* Grid Background */}
      <div
        className="absolute inset-0 pointer-events-none z-0"
        style={{
          backgroundSize: '40px 40px',
          backgroundImage: `
            linear-gradient(to right, rgba(28, 25, 23, 0.03) 1px, transparent 1px),
            linear-gradient(to bottom, rgba(28, 25, 23, 0.03) 1px, transparent 1px)
          `,
          maskImage: 'radial-gradient(circle at center, black 40%, transparent 80%)',
        }}
      ></div>

      {/* Three.js Canvas */}
      <div ref={canvasRef} className="absolute inset-0 z-10"></div>

      {/* Main Content */}
      <main className="relative z-20 pointer-events-none flex flex-col gap-6 md:gap-8 p-4 md:p-12 min-h-screen">
        {/* Header */}
        <header className="flex flex-col md:flex-row md:items-start md:justify-between gap-4 animate-fade-in pointer-events-auto" style={{ animationDelay: '0.1s' }}>
          <div className="flex flex-col gap-1">
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 border border-neutral-800 flex items-center justify-center rounded-sm bg-[#FDFCF8] relative overflow-hidden">
                <div className="absolute w-full h-[1px] bg-neutral-800 rotate-45"></div>
                <div className="absolute w-full h-[1px] bg-neutral-800 -rotate-45"></div>
              </div>
              <span className="font-serif text-xl tracking-tight text-[#1C1917] font-medium">VitaStore Inventory</span>
            </div>
            <div className="flex items-center gap-2 pl-11">
              <span className="font-mono text-[10px] uppercase tracking-widest text-[#78350F]/70">Est. 2024</span>
              <div className="h-px w-8 bg-[#78350F]/20"></div>
            </div>
          </div>

          <nav className="flex flex-wrap items-center gap-3 md:gap-8">
            <button
              onClick={() => {
                setEditingItem(null)
                setShowItemModal(true)
              }}
              className="font-mono text-xs text-neutral-500 hover:text-[#1C1917] transition-colors uppercase tracking-widest"
            >
              Add Item
            </button>
            <button
              onClick={openStockIn}
              className="font-mono text-xs text-neutral-500 hover:text-[#1C1917] transition-colors uppercase tracking-widest"
            >
              Stock In
            </button>
            <button
              onClick={() => {
                supabase.auth.signOut()
                router.push('/login')
              }}
              className="font-serif italic text-lg px-6 py-1 border border-neutral-200 hover:border-neutral-800 transition-colors text-[#1C1917] rounded-full"
            >
              Logout
            </button>
          </nav>
        </header>

        {/* Stats Section */}
        <div className="relative z-10 w-full max-w-4xl animate-fade-in opacity-0 pointer-events-auto mt-6 md:mt-0" style={{ animationDelay: '0.3s' }}>
          <div className="flex items-center gap-3 mb-6">
            <div className="h-px w-12 bg-[#9A3412]"></div>
            <span className="font-mono text-xs text-[#9A3412] uppercase tracking-[0.2em]">System Status</span>
          </div>

          <div className="grid grid-cols-2 md:grid-cols-4 gap-6 mb-8">
            <div className="vellum-glass rounded-sm p-4 border border-neutral-200/50">
              <div className="font-mono text-[10px] uppercase tracking-widest text-neutral-500 mb-2">Total Items</div>
              <div className="font-serif text-4xl text-[#1C1917]">{summary.totalItems}</div>
            </div>
            <div className="vellum-glass rounded-sm p-4 border border-neutral-200/50">
              <div className="font-mono text-[10px] uppercase tracking-widest text-neutral-500 mb-2">Low Stock</div>
              <div className="font-serif text-4xl text-[#1C1917]">{summary.lowStock}</div>
            </div>
            <div className="vellum-glass rounded-sm p-4 border border-neutral-200/50">
              <div className="font-mono text-[10px] uppercase tracking-widest text-neutral-500 mb-2">Categories</div>
              <div className="font-serif text-4xl text-[#1C1917]">{summary.categories}</div>
            </div>
            <div className="vellum-glass rounded-sm p-4 border border-neutral-200/50">
              <div className="font-mono text-[10px] uppercase tracking-widest text-neutral-500 mb-2">Value</div>
              <div className="font-serif text-4xl text-[#1C1917]">{formatKES(summary.totalValue)}</div>
            </div>
          </div>

          <div className="mt-10 flex items-center gap-4">
            <button
              onClick={() => {
                setEditingItem(null)
                setShowItemModal(true)
              }}
              className="group flex items-center gap-3 bg-[#1C1917] text-[#FDFCF8] pl-6 pr-5 py-3 rounded-sm hover:bg-[#78350F] transition-all duration-500"
            >
              <span className="font-mono text-xs tracking-widest uppercase">New Item</span>
              <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
            </button>
            <div className="h-px w-16 bg-neutral-300"></div>
            <span className="font-serif italic text-neutral-400">v.1.0</span>
          </div>
        </div>

        {/* Controls Panel */}
        <div
          className="pointer-events-auto w-full md:w-[280px] vellum-glass rounded-sm animate-fade-in opacity-0 mt-6 md:mt-0 md:self-start"
          style={{ animationDelay: '0.5s' }}
        >
          <div className="border-b border-neutral-200/60 px-4 py-3 flex justify-between items-center">
            <span className="font-serif italic text-lg text-[#1C1917]">Quick Actions</span>
            <div className="w-2 h-2 rounded-full bg-green-500/50 shadow-[0_0_8px_rgba(34,197,94,0.4)]"></div>
          </div>

          <div className="p-5 space-y-4">
            <button
              onClick={openStockIn}
              className="w-full flex items-center gap-3 p-3 rounded-sm bg-white/50 hover:bg-white/80 transition-colors border border-neutral-200/50"
            >
              <ArrowDownCircle className="w-4 h-4 text-[#1C1917]" />
              <span className="font-mono text-xs tracking-widest uppercase text-neutral-600">Stock In</span>
            </button>
            <button
              onClick={openStockOut}
              className="w-full flex items-center gap-3 p-3 rounded-sm bg-white/50 hover:bg-white/80 transition-colors border border-neutral-200/50"
            >
              <ArrowUpCircle className="w-4 h-4 text-[#1C1917]" />
              <span className="font-mono text-xs tracking-widest uppercase text-neutral-600">Stock Out</span>
            </button>
            <button
              onClick={() => {
                setEditingItem(null)
                setShowItemModal(true)
              }}
              className="w-full flex items-center gap-3 p-3 rounded-sm bg-white/50 hover:bg-white/80 transition-colors border border-neutral-200/50"
            >
              <Plus className="w-4 h-4 text-[#1C1917]" />
              <span className="font-mono text-xs tracking-widest uppercase text-neutral-600">Add Item</span>
            </button>
          </div>
        </div>

        {/* Items Table */}
        <div className="pointer-events-auto w-full vellum-glass rounded-sm max-h-[400px] md:max-h-none overflow-y-auto mt-6 md:mt-0">
            <div className="border-b border-neutral-200/60 px-4 py-3 flex flex-col md:flex-row md:justify-between md:items-center gap-3 sticky top-0 bg-[#FDFCF8]/95 backdrop-blur-sm">
            <span className="font-serif italic text-lg text-[#1C1917]">Inventory</span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 w-full md:w-auto">
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search..."
                  className="px-3 py-2 text-xs border border-neutral-200 rounded-sm bg-white/50 font-mono w-full"
                />
                <select
                  value={categoryFilter}
                  onChange={(e) => setCategoryFilter(e.target.value)}
                  className="px-3 py-2 text-xs border border-neutral-200 rounded-sm bg-white/50 font-mono w-full"
                >
                  <option value="">All Categories</option>
                  {categories.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat}
                    </option>
                  ))}
                </select>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 text-xs border border-neutral-200 rounded-sm bg-white/50 font-mono w-full"
                >
                  <option value="">All Status</option>
                  <option value="ok">OK</option>
                  <option value="low">Low</option>
                  <option value="out">Out</option>
                </select>
              </div>
            </div>

          <div className="p-4 overflow-x-auto">
            <table className="w-full min-w-[480px] text-left">
              <thead>
                <tr className="border-b border-neutral-200/50">
                  <th className="pb-2 text-[10px] font-mono uppercase tracking-widest text-neutral-500">Item</th>
                  <th className="pb-2 text-[10px] font-mono uppercase tracking-widest text-neutral-500">SKU</th>
                  <th className="pb-2 text-[10px] font-mono uppercase tracking-widest text-neutral-500">Stock</th>
                  <th className="pb-2 text-[10px] font-mono uppercase tracking-widest text-neutral-500">Status</th>
                  <th className="pb-2 text-[10px] font-mono uppercase tracking-widest text-neutral-500 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredItems.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-8 text-center text-neutral-400 font-serif italic">
                      No items found
                    </td>
                  </tr>
                ) : (
                  filteredItems.map((item) => {
                    const isLowStock = item.quantity <= item.min_stock
                    const isOutOfStock = item.quantity === 0

                    return (
                      <tr key={item.id} className="border-b border-neutral-200/30 hover:bg-white/30 transition-colors">
                        <td className="py-3">
                          <div className="flex items-center gap-2">
                            <Package className="w-4 h-4 text-neutral-400" />
                            <span className="font-serif text-sm text-[#1C1917]">{item.name}</span>
                          </div>
                        </td>
                        <td className="py-3">
                          <span className="font-mono text-xs text-neutral-500">{item.sku}</span>
                        </td>
                        <td className="py-3">
                          <span className="font-serif text-sm text-[#1C1917]">
                            {item.quantity} {item.unit || 'pcs'}
                          </span>
                        </td>
                        <td className="py-3">
                          <span
                            className={`font-mono text-[9px] uppercase tracking-widest px-2 py-1 rounded-sm ${
                              isOutOfStock
                                ? 'bg-red-100 text-red-800'
                                : isLowStock
                                ? 'bg-yellow-100 text-yellow-800'
                                : 'bg-green-100 text-green-800'
                            }`}
                          >
                            {isOutOfStock ? 'Out' : isLowStock ? 'Low' : 'OK'}
                          </span>
                        </td>
                        <td className="py-3 text-right">
                          <div className="flex items-center justify-end gap-2">
                            <button
                              onClick={() => openEditItem(item)}
                              className="text-neutral-400 hover:text-[#1C1917] transition-colors"
                            >
                              <Edit3 className="w-4 h-4" />
                            </button>
                            <button
                              onClick={() => handleItemDelete(item.id)}
                              className="text-neutral-400 hover:text-red-600 transition-colors"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    )
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Outbound History */}
        <div className="relative z-20 pointer-events-auto mt-6 md:mt-8">
        <div className="vellum-glass rounded-sm border border-neutral-200/60 overflow-hidden">
          <div className="border-b border-neutral-200/60 px-4 py-3 flex justify-between items-center bg-white/60">
            <span className="font-serif italic text-base md:text-lg text-[#1C1917]">Recently Moved Out</span>
            <span className="font-mono text-[9px] md:text-[10px] uppercase tracking-widest text-neutral-500">Last 10</span>
          </div>
          <div className="divide-y divide-neutral-200/60 max-h-[300px] md:max-h-none overflow-y-auto">
            {summary.recentTransactions.filter((tx: any) => tx.type === 'OUT').length === 0 ? (
              <div className="px-4 py-4 text-neutral-500 font-serif italic text-sm">No outbound history yet</div>
            ) : (
              summary.recentTransactions
                .filter((tx: any) => tx.type === 'OUT')
                .map((tx: any) => (
                  <div key={tx.id} className="px-4 py-3 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="flex flex-col gap-1 flex-1 min-w-0">
                      <span className="font-serif text-sm text-[#1C1917] truncate">{tx.items?.name || 'Unknown item'}</span>
                      <span className="font-mono text-[9px] md:text-[10px] uppercase tracking-widest text-neutral-500">
                        {tx.quantity} {tx.items?.unit || 'pcs'} · {tx.items?.sku || 'N/A'}
                      </span>
                      {tx.notes && (
                        <span className="font-mono text-[9px] md:text-[10px] text-neutral-500 truncate">
                          {tx.notes}
                        </span>
                      )}
                    </div>
                    <div className="text-left sm:text-right flex-shrink-0">
                      <span className="font-mono text-[10px] md:text-[11px] text-neutral-500">
                        {new Date(tx.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                ))
            )}
          </div>
        </div>

        </div>

        {/* Footer */}
        <div className="flex flex-col gap-1 opacity-60 pointer-events-none mt-4 md:mt-0">
          <span className="font-mono text-[9px] text-neutral-400">Items: {summary.totalItems}</span>
          <span className="font-mono text-[9px] text-neutral-400">Low Stock: {summary.lowStock}</span>
        </div>
      </main>

      {showItemModal && (
        <ItemModal
          item={editingItem}
          onClose={() => {
            setShowItemModal(false)
            setEditingItem(null)
          }}
          onSave={handleItemSave}
        />
      )}

      {showTransactionModal && (
        <TransactionModal
          type={transactionType}
          items={items}
          onClose={() => {
            setShowTransactionModal(false)
            setTransactionType(null)
          }}
          onSave={handleTransaction}
        />
      )}

      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(10px); }
          to { opacity: 1; transform: translateY(0); }
        }
        .animate-fade-in {
          animation: fadeIn 1.2s ease-out forwards;
        }
      `}</style>
    </div>
  )
}

