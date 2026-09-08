import { useState, useMemo, useEffect } from 'react';
import { useSearchParams, useLocation, Link } from 'react-router-dom';
import { 
  MagnifyingGlassIcon, 
  ShareIcon, 
  TruckIcon, 
  WrenchScrewdriverIcon, 
  Squares2X2Icon, 
  ListBulletIcon, 
  CheckIcon, 
  XMarkIcon,
  PrinterIcon,
  DocumentDuplicateIcon,
  ShieldCheckIcon,
  TagIcon,
  ArrowTopRightOnSquareIcon,
  ChatBubbleLeftRightIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PhotoIcon
} from '@heroicons/react/24/outline';
import { fetchInventory, getLocalStorageInventory, type InventoryItem } from '../services/inventoryService';
import logo from '../assets/logo.png';

interface CatalogProps {
  isPublic?: boolean;
}

export default function Catalog({ isPublic: isPublicProp }: CatalogProps) {
  const location = useLocation();
  const isPublic = isPublicProp || location.pathname.includes('/tienda') || location.pathname.includes('/catalogo-publico');
  
  const [searchParams, setSearchParams] = useSearchParams();
  const [inventory, setInventory] = useState<InventoryItem[]>(() => getLocalStorageInventory());
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedType, setSelectedType] = useState<string>('Todos');
  const [selectedBrand, setSelectedBrand] = useState<string>('Todas');
  const [selectedStatus, setSelectedStatus] = useState<string>('Disponible');
  const [selectedPriceFilter, setSelectedPriceFilter] = useState<string>('Todos');
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const [selectedItem, setSelectedItem] = useState<InventoryItem | null>(null);
  const [activePhotoIndex, setActivePhotoIndex] = useState(0);
  const [copiedItemId, setCopiedItemId] = useState<string | null>(null);
  const [copiedCatalog, setCopiedCatalog] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const loadData = async () => {
      const items = await fetchInventory();
      if (isMounted && items && items.length > 0) {
        setInventory(items);
      }
    };
    loadData();
    return () => {
      isMounted = false;
    };
  }, []);

  // Handle URL query for direct item link (e.g., ?item=id)
  useEffect(() => {
    const itemId = searchParams.get('item');
    if (itemId && inventory.length > 0) {
      const found = inventory.find(i => String(i.id) === itemId);
      if (found) {
        setSelectedItem(found);
        setActivePhotoIndex(0);
      }
    }
  }, [searchParams, inventory]);

  const itemPhotos = useMemo(() => {
    if (!selectedItem) return [];
    if (Array.isArray(selectedItem.images) && selectedItem.images.length > 0) {
      return selectedItem.images;
    }
    if (selectedItem.image_url) return [selectedItem.image_url];
    return [];
  }, [selectedItem]);

  // Unique Brands
  const availableBrands = useMemo(() => {
    const brands = new Set<string>();
    inventory.forEach(item => {
      if (item.brand && item.brand.trim()) {
        brands.add(item.brand.trim());
      }
    });
    return ['Todas', ...Array.from(brands).sort()];
  }, [inventory]);

  // Filtered Items
  const filteredItems = useMemo(() => {
    const q = searchQuery.toLowerCase().trim();
    return inventory.filter(item => {
      // Type Filter
      if (selectedType !== 'Todos') {
        if (selectedType === 'Camión' && item.type !== 'Camión') return false;
        if (selectedType === 'Equipo_Pesado' && item.type !== 'Equipo_Pesado') return false;
        if (selectedType === 'Pieza' && item.type !== 'Pieza') return false;
      }

      // Brand Filter
      if (selectedBrand !== 'Todas') {
        if (!item.brand || item.brand.toLowerCase() !== selectedBrand.toLowerCase()) return false;
      }

      // Status Filter
      if (selectedStatus !== 'Todos') {
        if (selectedStatus === 'Disponible' && item.status !== 'Disponible' && item.status) return false;
        if (selectedStatus === 'Reservado' && item.status !== 'Reservado') return false;
        if (selectedStatus === 'Vendido' && item.status !== 'Vendido') return false;
      }

      // Price Filter
      if (selectedPriceFilter === 'Visibles') {
        if (item.show_price === false || !item.price || Number(item.price) <= 0) return false;
      } else if (selectedPriceFilter === 'Consultar') {
        if (item.show_price !== false && item.price && Number(item.price) > 0) return false;
      }

      // Search Query
      if (q) {
        const nameMatch = (item.name || '').toLowerCase().includes(q);
        const brandMatch = (item.brand || '').toLowerCase().includes(q);
        const modelMatch = (item.model || '').toLowerCase().includes(q);
        const vinMatch = (item.vin || item.chassis_number || '').toLowerCase().includes(q);
        const partMatch = (item.part_number || item.barcode || '').toLowerCase().includes(q);
        const descMatch = (item.description || '').toLowerCase().includes(q);
        const yearMatch = item.year ? String(item.year).includes(q) : false;
        return nameMatch || brandMatch || modelMatch || vinMatch || partMatch || descMatch || yearMatch;
      }

      return true;
    });
  }, [inventory, searchQuery, selectedType, selectedBrand, selectedStatus, selectedPriceFilter]);

  // Counts by category
  const categoryCounts = useMemo(() => {
    return {
      all: inventory.length,
      trucks: inventory.filter(i => i.type === 'Camión').length,
      heavy: inventory.filter(i => i.type === 'Equipo_Pesado').length,
      parts: inventory.filter(i => i.type === 'Pieza').length,
    };
  }, [inventory]);

  const getItemTypeLabel = (type?: string) => {
    switch (type) {
      case 'Camión': return 'Camión';
      case 'Equipo_Pesado': return 'Equipo Pesado';
      case 'Pieza': return 'Pieza / Repuesto';
      default: return 'Artículo';
    }
  };

  const getItemTypeIcon = (type?: string) => {
    switch (type) {
      case 'Camión': return <TruckIcon className="w-5 h-5 text-gray-700 dark:text-zinc-300" />;
      case 'Equipo_Pesado': return <TruckIcon className="w-5 h-5 text-gray-700 dark:text-zinc-300" />;
      case 'Pieza': return <WrenchScrewdriverIcon className="w-5 h-5 text-gray-700 dark:text-zinc-300" />;
      default: return <TagIcon className="w-5 h-5 text-gray-700 dark:text-zinc-300" />;
    }
  };

  const getStatusBadge = (status?: string) => {
    switch (status) {
      case 'Disponible':
      default:
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 dark:bg-emerald-950/80 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800/60">
            Disponible
          </span>
        );
      case 'Reservado':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-800 dark:bg-amber-950/80 dark:text-amber-300 border border-amber-200 dark:border-amber-800/60">
            Reservado
          </span>
        );
      case 'Vendido':
        return (
          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-gray-100 text-gray-800 dark:bg-zinc-800 dark:text-zinc-300 border border-gray-200 dark:border-zinc-700">
            Vendido
          </span>
        );
    }
  };

  const generateShareItemUrl = (item: InventoryItem) => {
    const origin = window.location.origin;
    return `${origin}/tienda?item=${item.id}`;
  };

  const handleCopyItemLink = (item: InventoryItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const url = generateShareItemUrl(item);
    navigator.clipboard.writeText(url);
    setCopiedItemId(item.id);
    setTimeout(() => setCopiedItemId(null), 2500);
  };

  const handleShareCatalogWhatsApp = () => {
    const origin = window.location.origin;
    const catalogUrl = `${origin}/tienda`;
    const text = `🚜 *TIENDA Y CATÁLOGO DIGITAL - BRIANNA HEAVY*\n\n` +
      `Estimado cliente, puede consultar nuestro catálogo completo de camiones, piezas y equipos pesados en el siguiente enlace:\n\n` +
      `👉 *Ver Tienda Online:* ${catalogUrl}\n\n` +
      `Contáctenos directamente para cotizaciones y opciones de financiamiento.`;
    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleCopyCatalogLink = () => {
    const origin = window.location.origin;
    navigator.clipboard.writeText(`${origin}/tienda`);
    setCopiedCatalog(true);
    setTimeout(() => setCopiedCatalog(false), 2500);
  };

  const handleShareItemWhatsApp = (item: InventoryItem, e?: React.MouseEvent) => {
    if (e) e.stopPropagation();
    const url = generateShareItemUrl(item);
    const specs = [
      item.year ? `*Año:* ${item.year}` : '',
      item.brand ? `*Marca:* ${item.brand}` : '',
      item.model ? `*Modelo:* ${item.model}` : '',
      item.mileage_hours ? `*Horas/Km:* ${item.mileage_hours}` : '',
      item.vin ? `*VIN/Chasis:* ${item.vin}` : '',
      item.part_number ? `*No. Parte:* ${item.part_number}` : '',
    ].filter(Boolean).join('\n• ');

    const isPriceHidden = item.show_price === false || !item.price || Number(item.price) <= 0;
    const priceText = isPriceHidden 
      ? 'A Consultar / Cotizar' 
      : `RD$ ${Number(item.price).toLocaleString('es-DO', { minimumFractionDigits: 2 })}`;

    const text = `🚜 *BRIANNA HEAVY - INFORMACIÓN DEL PRODUCTO*\n\n` +
      `*${item.name}*\n` +
      `💰 *Precio:* ${priceText}\n` +
      `📦 *Estado:* ${item.status || 'Disponible'}\n\n` +
      `*Especificaciones:*\n• ${specs}\n\n` +
      `🔗 *Ver Ficha del Producto:* ${url}\n\n` +
      `¡Hola! Me interesa este artículo, ¿podrían darme más información?`;

    window.open(`https://wa.me/?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handleOpenDetail = (item: InventoryItem) => {
    setSelectedItem(item);
    setActivePhotoIndex(0);
    setSearchParams({ item: item.id });
  };

  const handleCloseDetail = () => {
    setSelectedItem(null);
    setSearchParams({});
  };

  return (
    <div className={isPublic ? "min-h-screen bg-[#f8f9fa] dark:bg-[#0c0d12] text-gray-900 dark:text-zinc-100 flex flex-col font-sans" : "space-y-6"}>
      {/* Public Storefront Header (Only for Clients on /tienda) */}
      {isPublic && (
        <header className="sticky top-0 z-40 bg-white/95 dark:bg-[#12131a]/95 backdrop-blur-md border-b border-gray-200/80 dark:border-zinc-800/80 shadow-xs">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-20 flex items-center justify-between gap-4">
            <div className="flex items-center gap-3.5">
              <div className="h-11 w-24 sm:h-12 sm:w-28 rounded-xl bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-800 flex items-center justify-center p-1.5 shadow-2xs">
                <img src={logo} alt="Brianna Heavy" className="max-h-full max-w-full object-contain" />
              </div>
              <div className="hidden sm:flex flex-col">
                <span className="font-black text-xs uppercase tracking-tight text-gray-900 dark:text-white">
                  Brianna Heavy Equipment
                </span>
                <span className="text-[10px] font-bold text-[#ED1C24] uppercase tracking-wider">
                  Tienda & Catálogo Digital
                </span>
              </div>
            </div>

            {/* Public Quick Contact Buttons */}
            <div className="flex items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={handleShareCatalogWhatsApp}
                className="flex items-center gap-1.5 px-3.5 sm:px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full font-bold text-xs shadow-xs transition-all cursor-pointer"
              >
                <ChatBubbleLeftRightIcon className="w-4 h-4" />
                <span>Contactar por WhatsApp</span>
              </button>
            </div>
          </div>
        </header>
      )}

      {/* Internal Management Header (Inside ERP) */}
      {!isPublic && (
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 print:hidden">
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-black text-gray-900 dark:text-white tracking-tight">
                Catálogo Digital
              </h1>
              <span className="text-xs font-bold px-2.5 py-0.5 rounded-full bg-red-100 text-[#ED1C24] dark:bg-red-950/80 dark:text-red-400 border border-red-200 dark:border-red-900/50">
                {filteredItems.length} Artículos
              </span>
            </div>
            <p className="text-xs text-gray-500 dark:text-zinc-400 font-medium mt-0.5">
              Vista comercial de camiones, piezas y equipo pesado compartible con clientes
            </p>
          </div>

          <div className="flex items-center gap-2.5">
            <Link
              to="/tienda"
              target="_blank"
              className="flex items-center gap-1.5 px-3.5 py-2.5 bg-gray-900 text-white hover:bg-black dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-white rounded-full font-bold text-xs shadow-xs transition-all cursor-pointer"
              title="Abrir vista pública para clientes en pestaña nueva"
            >
              <ArrowTopRightOnSquareIcon className="w-4 h-4" />
              <span>Ver como Tienda</span>
            </Link>

            <button
              type="button"
              onClick={handleShareCatalogWhatsApp}
              className="flex items-center gap-2 px-4 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-full font-bold text-xs shadow-xs transition-all cursor-pointer"
              title="Compartir catálogo completo por WhatsApp"
            >
              <span>Compartir Catálogo</span>
            </button>

            <button
              type="button"
              onClick={handleCopyCatalogLink}
              className="flex items-center gap-1.5 px-3.5 py-2.5 bg-white dark:bg-[#1a1a1a] text-gray-700 dark:text-zinc-300 border border-gray-200 dark:border-zinc-800 hover:bg-gray-50 dark:hover:bg-zinc-800/80 rounded-full font-bold text-xs transition-all shadow-xs cursor-pointer"
              title="Copiar enlace del catálogo"
            >
              {copiedCatalog ? <CheckIcon className="w-4 h-4 text-emerald-600" /> : <ShareIcon className="w-4 h-4 text-gray-500" />}
              <span>{copiedCatalog ? 'Enlace Copiado' : 'Copiar Link'}</span>
            </button>

            <div className="hidden sm:flex items-center bg-white dark:bg-[#1a1a1a] p-1 rounded-full border border-gray-200 dark:border-zinc-800">
              <button
                type="button"
                onClick={() => setViewMode('grid')}
                className={`p-1.5 rounded-full transition-all cursor-pointer ${
                  viewMode === 'grid'
                    ? 'bg-gray-900 text-white dark:bg-white dark:text-zinc-900 shadow-2xs'
                    : 'text-gray-400 hover:text-gray-700 dark:hover:text-zinc-200'
                }`}
                title="Vista en Cuadrícula"
              >
                <Squares2X2Icon className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`p-1.5 rounded-full transition-all cursor-pointer ${
                  viewMode === 'list'
                    ? 'bg-gray-900 text-white dark:bg-white dark:text-zinc-900 shadow-2xs'
                    : 'text-gray-400 hover:text-gray-700 dark:hover:text-zinc-200'
                }`}
                title="Vista en Lista"
              >
                <ListBulletIcon className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Container */}
      <div className={isPublic ? "max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8 flex-1 w-full space-y-6" : "space-y-6"}>
        {/* Store Banner Hero (For Public Store View) */}
        {isPublic && (
          <div className="bg-gradient-to-r from-gray-900 via-[#1a1c24] to-gray-900 text-white rounded-3xl p-6 sm:p-10 shadow-lg border border-gray-800 relative overflow-hidden">
            <div className="relative z-10 max-w-2xl space-y-2.5">
              <span className="text-[10px] font-black uppercase tracking-widest text-[#ED1C24] bg-red-950/80 px-2.5 py-1 rounded-md border border-red-900/50">
                Inventario Disponible
              </span>
              <h2 className="text-2xl sm:text-4xl font-black tracking-tight leading-tight">
                Camiones, Maquinaria Pesada y Repuestos
              </h2>
              <p className="text-xs sm:text-sm text-gray-300 font-medium">
                Explora los artículos disponibles con ficha técnica completa y solicita cotización directa en 1 clic.
              </p>
            </div>
          </div>
        )}

        {/* Category Tabs & Filter Toolbar */}
        <div className="space-y-3.5 print:hidden">
          {/* Category Tabs */}
          <div className="flex items-center gap-1.5 bg-white dark:bg-[#14151b] p-1.5 rounded-full shadow-xs border border-gray-200/80 dark:border-zinc-800 text-xs w-full overflow-x-auto scrollbar-hide">
            <button
              type="button"
              onClick={() => setSelectedType('Todos')}
              className={`px-4 py-2 rounded-full transition-all whitespace-nowrap cursor-pointer flex items-center gap-1.5 ${
                selectedType === 'Todos'
                  ? 'bg-gray-900 text-white dark:bg-white dark:text-zinc-900 font-bold shadow-xs'
                  : 'text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white font-medium hover:bg-gray-50 dark:hover:bg-zinc-800/50'
              }`}
            >
              <span>Todos los Artículos</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                selectedType === 'Todos'
                  ? 'bg-white/20 text-white dark:bg-zinc-900/20 dark:text-zinc-900'
                  : 'bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400'
              }`}>
                {categoryCounts.all}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedType('Camión')}
              className={`px-4 py-2 rounded-full transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                selectedType === 'Camión'
                  ? 'bg-gray-900 text-white dark:bg-white dark:text-zinc-900 font-bold shadow-xs'
                  : 'text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white font-medium hover:bg-gray-50 dark:hover:bg-zinc-800/50'
              }`}
            >
              <TruckIcon className="w-3.5 h-3.5" />
              <span>Camiones</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                selectedType === 'Camión'
                  ? 'bg-white/20 text-white dark:bg-zinc-900/20 dark:text-zinc-900'
                  : 'bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400'
              }`}>
                {categoryCounts.trucks}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedType('Equipo_Pesado')}
              className={`px-4 py-2 rounded-full transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                selectedType === 'Equipo_Pesado'
                  ? 'bg-gray-900 text-white dark:bg-white dark:text-zinc-900 font-bold shadow-xs'
                  : 'text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white font-medium hover:bg-gray-50 dark:hover:bg-zinc-800/50'
              }`}
            >
              <TruckIcon className="w-3.5 h-3.5" />
              <span>Maquinaria Pesada</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                selectedType === 'Equipo_Pesado'
                  ? 'bg-white/20 text-white dark:bg-zinc-900/20 dark:text-zinc-900'
                  : 'bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400'
              }`}>
                {categoryCounts.heavy}
              </span>
            </button>

            <button
              type="button"
              onClick={() => setSelectedType('Pieza')}
              className={`px-4 py-2 rounded-full transition-all whitespace-nowrap flex items-center gap-1.5 cursor-pointer ${
                selectedType === 'Pieza'
                  ? 'bg-gray-900 text-white dark:bg-white dark:text-zinc-900 font-bold shadow-xs'
                  : 'text-gray-500 hover:text-gray-900 dark:text-zinc-400 dark:hover:text-white font-medium hover:bg-gray-50 dark:hover:bg-zinc-800/50'
              }`}
            >
              <WrenchScrewdriverIcon className="w-3.5 h-3.5" />
              <span>Piezas y Repuestos</span>
              <span className={`px-1.5 py-0.2 rounded-full text-[10px] font-bold ${
                selectedType === 'Pieza'
                  ? 'bg-white/20 text-white dark:bg-zinc-900/20 dark:text-zinc-900'
                  : 'bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400'
              }`}>
                {categoryCounts.parts}
              </span>
            </button>
          </div>

          {/* Filter Toolbar */}
          <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5">
            <div className="sm:col-span-4 md:col-span-5 relative">
              <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none">
                <MagnifyingGlassIcon className="h-4 w-4 text-gray-400" />
              </div>
              <input
                type="text"
                placeholder="Buscar por nombre, marca, modelo, VIN o no. de parte..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-10 pr-4 py-2.5 bg-white dark:bg-[#14151b] border border-gray-200/80 dark:border-zinc-800 rounded-2xl text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#ED1C24]/30 shadow-2xs text-gray-900 dark:text-white placeholder-gray-400 dark:placeholder-zinc-500 transition-all"
              />
            </div>

            <div className="sm:col-span-3 md:col-span-3">
              <select
                value={selectedBrand}
                onChange={(e) => setSelectedBrand(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white dark:bg-[#14151b] border border-gray-200/80 dark:border-zinc-800 rounded-2xl text-xs font-semibold text-gray-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-[#ED1C24]/30 shadow-2xs transition-all"
              >
                {availableBrands.map(b => (
                  <option key={b} value={b}>Marca: {b}</option>
                ))}
              </select>
            </div>

            <div className="sm:col-span-3 md:col-span-2">
              <select
                value={selectedStatus}
                onChange={(e) => setSelectedStatus(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white dark:bg-[#14151b] border border-gray-200/80 dark:border-zinc-800 rounded-2xl text-xs font-semibold text-gray-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-[#ED1C24]/30 shadow-2xs transition-all"
              >
                <option value="Disponible">Disponibles</option>
                <option value="Todos">Todos los Estados</option>
                <option value="Reservado">Reservados</option>
                <option value="Vendido">Vendidos</option>
              </select>
            </div>

            <div className="sm:col-span-2 md:col-span-2">
              <select
                value={selectedPriceFilter}
                onChange={(e) => setSelectedPriceFilter(e.target.value)}
                className="w-full px-3.5 py-2.5 bg-white dark:bg-[#14151b] border border-gray-200/80 dark:border-zinc-800 rounded-2xl text-xs font-semibold text-gray-700 dark:text-zinc-300 focus:outline-none focus:ring-2 focus:ring-[#ED1C24]/30 shadow-2xs transition-all"
              >
                <option value="Todos">Precios: Todos</option>
                <option value="Visibles">Con Precio</option>
                <option value="Consultar">A Consultar</option>
              </select>
            </div>
          </div>
        </div>

        {/* Store Products Grid */}
        {filteredItems.length === 0 ? (
          <div className="bg-white dark:bg-[#14151b] rounded-3xl p-12 text-center border border-gray-200/80 dark:border-zinc-800">
            <TruckIcon className="w-12 h-12 text-gray-300 dark:text-zinc-600 mx-auto mb-3" />
            <h3 className="text-base font-black text-gray-900 dark:text-white">No se encontraron artículos</h3>
            <p className="text-xs text-gray-500 dark:text-zinc-400 max-w-md mx-auto mt-1">
              Prueba cambiando los filtros de búsqueda o categoría para encontrar lo que necesitas.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-6">
            {filteredItems.map(item => (
              <div
                key={item.id}
                onClick={() => handleOpenDetail(item)}
                className="group bg-white dark:bg-[#14151b] rounded-3xl border border-gray-200/80 dark:border-zinc-800/90 overflow-hidden shadow-xs hover:shadow-xl hover:border-gray-300 dark:hover:border-zinc-700 transition-all flex flex-col cursor-pointer"
              >
                {/* Product Image */}
                <div className="relative h-48 bg-gradient-to-br from-gray-100 to-gray-200 dark:from-zinc-900 dark:to-zinc-800 overflow-hidden flex items-center justify-center">
                  {(item.images && item.images.length > 0) || item.image_url ? (
                    <img
                      src={item.images?.[0] || item.image_url}
                      alt={item.name}
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                    />
                  ) : (
                    <div className="flex flex-col items-center justify-center text-gray-400 dark:text-zinc-600 p-4 text-center">
                      {item.type === 'Camión' ? (
                        <TruckIcon className="w-16 h-16 stroke-1 text-gray-400 dark:text-zinc-500" />
                      ) : item.type === 'Equipo_Pesado' ? (
                        <TruckIcon className="w-16 h-16 stroke-1 text-gray-400 dark:text-zinc-500" />
                      ) : (
                        <WrenchScrewdriverIcon className="w-16 h-16 stroke-1 text-gray-400 dark:text-zinc-500" />
                      )}
                      <span className="text-[11px] font-bold mt-2 uppercase tracking-wider text-gray-500 dark:text-zinc-400">
                        {item.brand || getItemTypeLabel(item.type)}
                      </span>
                    </div>
                  )}

                  {/* Top Badges */}
                  <div className="absolute top-3 left-3 flex items-center gap-1.5">
                    {item.status && item.status !== 'Disponible' && getStatusBadge(item.status)}
                    {item.year && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-black/75 backdrop-blur-xs text-white">
                        {item.year}
                      </span>
                    )}
                  </div>

                  <div className="absolute top-3 right-3">
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-semibold bg-white/90 dark:bg-zinc-900/90 backdrop-blur-xs text-gray-800 dark:text-zinc-200 shadow-2xs">
                      {getItemTypeLabel(item.type)}
                    </span>
                  </div>

                  {/* Multiple Photos Badge */}
                  {item.images && item.images.length > 1 && (
                    <div className="absolute bottom-3 right-3 z-10 pointer-events-none">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-black/70 backdrop-blur-xs text-white flex items-center gap-1">
                        <PhotoIcon className="w-3 h-3 text-white/80" />
                        <span>{item.images.length} fotos</span>
                      </span>
                    </div>
                  )}
                </div>

                {/* Product Info - Minimalist & Simple */}
                <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between">
                  <div>
                    {/* Brand / Category & Stock */}
                    <div className="flex items-center justify-between gap-2 text-[11px] text-gray-500 dark:text-zinc-400 mb-1">
                      <span className="font-semibold truncate uppercase tracking-wider text-[10px]">
                        {item.brand && item.brand.trim() ? item.brand : getItemTypeLabel(item.type)}
                      </span>
                      {item.stock !== undefined && (
                        <span className={`shrink-0 font-medium flex items-center gap-1 text-[11px] ${
                          Number(item.stock) > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-gray-400'
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${Number(item.stock) > 0 ? 'bg-emerald-500' : 'bg-gray-400'}`} />
                          <span>{Number(item.stock) > 0 ? `${item.stock} en stock` : 'Agotado'}</span>
                        </span>
                      )}
                    </div>

                    {/* Title */}
                    <h3 className="text-base font-bold text-gray-900 dark:text-zinc-100 group-hover:text-[#ED1C24] transition-colors line-clamp-2 leading-snug">
                      {item.name}
                    </h3>

                    {/* Quick key detail if available */}
                    {(item.part_number || item.vin) && (
                      <p className="text-[11px] text-gray-400 dark:text-zinc-500 mt-1 truncate">
                        {item.part_number ? `No. Parte: ${item.part_number}` : `VIN: ${item.vin}`}
                      </p>
                    )}
                  </div>

                  {/* Price & Contact Button */}
                  <div className="mt-4 pt-3 border-t border-gray-100 dark:border-zinc-800/70 flex items-center justify-between gap-2">
                    <div>
                      {item.show_price !== false && item.price && Number(item.price) > 0 ? (
                        <div className="flex flex-col">
                          <span className="text-[10px] uppercase font-bold text-gray-400 dark:text-zinc-500 leading-none mb-0.5">
                            Precio
                          </span>
                          <span className="text-base sm:text-lg font-black text-gray-900 dark:text-white font-mono leading-none">
                            RD$ {Number(item.price).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                          </span>
                        </div>
                      ) : (
                        <span className="text-xs sm:text-sm font-bold text-gray-600 dark:text-zinc-400">
                          Precio a Consultar
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
                      <button
                        type="button"
                        onClick={(e) => handleShareItemWhatsApp(item, e)}
                        className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer active:scale-95"
                        title="Consultar por WhatsApp"
                      >
                        <ChatBubbleLeftRightIcon className="w-4 h-4" />
                        <span>Consultar</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Store Product Detail Modal (Public View for Clients) */}
      {selectedItem && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 md:p-6 bg-black/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white dark:bg-[#14151b] rounded-3xl max-w-3xl w-full max-h-[92vh] overflow-y-auto border border-gray-200/90 dark:border-zinc-800 shadow-2xl animate-in zoom-in-95 duration-150">
            {/* Modal Header */}
            <div className="sticky top-0 z-10 bg-white/95 dark:bg-[#14151b]/95 backdrop-blur-md p-4 sm:p-6 border-b border-gray-100 dark:border-zinc-800/80 flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-2xl bg-red-50 dark:bg-red-950/50 text-[#ED1C24]">
                  {getItemTypeIcon(selectedItem.type)}
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-bold uppercase text-gray-400 dark:text-zinc-500">
                      {getItemTypeLabel(selectedItem.type)}
                    </span>
                    {getStatusBadge(selectedItem.status)}
                  </div>
                  <h2 className="text-base sm:text-lg font-black text-gray-900 dark:text-white tracking-tight">
                    {selectedItem.name}
                  </h2>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="p-2 text-gray-600 dark:text-zinc-300 hover:text-gray-900 dark:hover:text-white bg-gray-100 dark:bg-zinc-800 rounded-full transition-all cursor-pointer"
                  title="Imprimir Ficha Técnica"
                >
                  <PrinterIcon className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={handleCloseDetail}
                  className="p-2 text-gray-400 hover:text-gray-900 dark:hover:text-zinc-100 bg-gray-100 dark:bg-zinc-800 rounded-full transition-all cursor-pointer"
                  title="Cerrar"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>
            </div>

            {/* Modal Body */}
            <div className="p-5 sm:p-7 space-y-6">
              {/* Product Photo Gallery Carousel */}
              {itemPhotos.length > 0 ? (
                <div className="space-y-3">
                  {/* Main Large Photo */}
                  <div className="relative h-64 sm:h-80 md:h-96 rounded-3xl bg-black/90 dark:bg-zinc-950 overflow-hidden flex items-center justify-center border border-gray-200/80 dark:border-zinc-800 shadow-md group">
                    <img
                      src={itemPhotos[activePhotoIndex] || itemPhotos[0]}
                      alt={selectedItem.name}
                      className="max-h-full max-w-full object-contain transition-all duration-300"
                    />

                    {/* Navigation Arrows (if multiple photos) */}
                    {itemPhotos.length > 1 && (
                      <>
                        <button
                          type="button"
                          onClick={() => setActivePhotoIndex(prev => (prev > 0 ? prev - 1 : itemPhotos.length - 1))}
                          className="absolute left-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-md transition-all cursor-pointer shadow-lg hover:scale-110 active:scale-95"
                          title="Foto Anterior"
                        >
                          <ChevronLeftIcon className="w-5 h-5 stroke-[2.5]" />
                        </button>

                        <button
                          type="button"
                          onClick={() => setActivePhotoIndex(prev => (prev < itemPhotos.length - 1 ? prev + 1 : 0))}
                          className="absolute right-3 top-1/2 -translate-y-1/2 p-2.5 rounded-full bg-black/60 hover:bg-black/80 text-white backdrop-blur-md transition-all cursor-pointer shadow-lg hover:scale-110 active:scale-95"
                          title="Siguiente Foto"
                        >
                          <ChevronRightIcon className="w-5 h-5 stroke-[2.5]" />
                        </button>

                        {/* Photo Counter Badge */}
                        <div className="absolute top-3.5 right-3.5 pointer-events-none">
                          <span className="px-3 py-1 rounded-full text-xs font-black bg-black/75 backdrop-blur-md text-white border border-white/10 shadow-sm flex items-center gap-1.5">
                            <PhotoIcon className="w-3.5 h-3.5 text-red-400" />
                            <span>{activePhotoIndex + 1} de {itemPhotos.length}</span>
                          </span>
                        </div>
                      </>
                    )}
                  </div>

                  {/* Thumbnails Strip (if multiple photos) */}
                  {itemPhotos.length > 1 && (
                    <div className="flex items-center gap-2 overflow-x-auto pb-1.5 scrollbar-thin">
                      {itemPhotos.map((photo, idx) => (
                        <button
                          key={idx}
                          type="button"
                          onClick={() => setActivePhotoIndex(idx)}
                          className={`relative shrink-0 w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden bg-gray-100 dark:bg-zinc-800 border-2 transition-all cursor-pointer ${
                            activePhotoIndex === idx
                              ? 'border-[#ED1C24] ring-2 ring-[#ED1C24]/30 scale-105 shadow-sm'
                              : 'border-gray-200 dark:border-zinc-700 opacity-60 hover:opacity-100'
                          }`}
                        >
                          <img src={photo} alt={`Miniatura ${idx + 1}`} className="w-full h-full object-cover" />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              ) : null}

              {/* Product Price Card */}
              <div className="bg-gray-50 dark:bg-zinc-900/60 rounded-2xl p-5 border border-gray-200/70 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="w-16 h-16 rounded-2xl bg-white dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 flex items-center justify-center p-2 shrink-0">
                    <img src={logo} alt="Brianna Heavy" className="max-h-full max-w-full object-contain" />
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase text-gray-400 dark:text-zinc-500 block">
                      Brianna Heavy Equipment
                    </span>
                    <h4 className="text-sm font-bold text-gray-800 dark:text-zinc-200">
                      Información del Artículo
                    </h4>
                  </div>
                </div>

                <div className="text-right sm:text-right w-full sm:w-auto">
                  <span className="text-[10px] uppercase font-bold text-gray-400 dark:text-zinc-500 block">
                    Precio
                  </span>
                  {selectedItem.show_price !== false && selectedItem.price && Number(selectedItem.price) > 0 ? (
                    <span className="text-2xl font-black text-gray-900 dark:text-white font-mono">
                      RD$ {Number(selectedItem.price).toLocaleString('es-DO', { minimumFractionDigits: 2 })}
                    </span>
                  ) : (
                    <div className="flex flex-col items-end sm:items-end">
                      <span className="inline-flex items-center text-sm font-black text-amber-700 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/50 px-3 py-1.5 rounded-xl border border-amber-200 dark:border-amber-800/60">
                        Precio a Consultar
                      </span>
                      <span className="text-[10px] text-gray-500 dark:text-zinc-400 font-medium mt-0.5">
                        Cotización bajo solicitud
                      </span>
                    </div>
                  )}
                </div>
              </div>

              {/* Technical Specifications Grid */}
              <div className="space-y-3">
                <h4 className="text-xs font-black uppercase tracking-wider text-gray-900 dark:text-zinc-200 flex items-center gap-1.5">
                  <ShieldCheckIcon className="w-4 h-4 text-[#ED1C24]" />
                  Detalles y Especificaciones
                </h4>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                  <div className="p-3 bg-gray-50/70 dark:bg-zinc-900/40 rounded-xl border border-gray-100 dark:border-zinc-800">
                    <span className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase block">Marca</span>
                    <span className="text-xs font-bold text-gray-900 dark:text-zinc-100">{selectedItem.brand || 'No especificada'}</span>
                  </div>

                  <div className="p-3 bg-gray-50/70 dark:bg-zinc-900/40 rounded-xl border border-gray-100 dark:border-zinc-800">
                    <span className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase block">Modelo</span>
                    <span className="text-xs font-bold text-gray-900 dark:text-zinc-100">{selectedItem.model || 'No especificado'}</span>
                  </div>

                  <div className="p-3 bg-gray-50/70 dark:bg-zinc-900/40 rounded-xl border border-gray-100 dark:border-zinc-800">
                    <span className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase block">Año</span>
                    <span className="text-xs font-bold text-gray-900 dark:text-zinc-100">{selectedItem.year || 'N/A'}</span>
                  </div>

                  <div className="p-3 bg-gray-50/70 dark:bg-zinc-900/40 rounded-xl border border-gray-100 dark:border-zinc-800">
                    <span className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase block">Chasis / VIN / Serial</span>
                    <span className="text-xs font-mono font-bold text-gray-900 dark:text-zinc-100 uppercase">{selectedItem.vin || selectedItem.chassis_number || 'No especificado'}</span>
                  </div>

                  <div className="p-3 bg-gray-50/70 dark:bg-zinc-900/40 rounded-xl border border-gray-100 dark:border-zinc-800">
                    <span className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase block">No. de Motor</span>
                    <span className="text-xs font-mono font-bold text-gray-900 dark:text-zinc-100">{selectedItem.engine_number || 'N/A'}</span>
                  </div>

                  <div className="p-3 bg-gray-50/70 dark:bg-zinc-900/40 rounded-xl border border-gray-100 dark:border-zinc-800">
                    <span className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase block">Horas / Kilometraje</span>
                    <span className="text-xs font-bold text-gray-900 dark:text-zinc-100">{selectedItem.mileage_hours !== undefined && selectedItem.mileage_hours !== null && String(selectedItem.mileage_hours).trim() !== '' ? selectedItem.mileage_hours : '0 Km / Horas'}</span>
                  </div>

                  {selectedItem.part_number && (
                    <div className="p-3 bg-gray-50/70 dark:bg-zinc-900/40 rounded-xl border border-gray-100 dark:border-zinc-800">
                      <span className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase block">Número de Parte</span>
                      <span className="text-xs font-mono font-bold text-gray-900 dark:text-zinc-100">{selectedItem.part_number}</span>
                    </div>
                  )}

                  <div className="p-3 bg-gray-50/70 dark:bg-zinc-900/40 rounded-xl border border-gray-100 dark:border-zinc-800">
                    <span className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase block">Disponibilidad</span>
                    <span className="text-xs font-bold text-gray-900 dark:text-zinc-100">{selectedItem.stock || 1} en stock</span>
                  </div>

                  <div className="p-3 bg-gray-50/70 dark:bg-zinc-900/40 rounded-xl border border-gray-100 dark:border-zinc-800">
                    <span className="text-[10px] font-bold text-gray-400 dark:text-zinc-500 uppercase block">Categoría</span>
                    <span className="text-xs font-bold text-gray-900 dark:text-zinc-100">{getItemTypeLabel(selectedItem.type)}</span>
                  </div>
                </div>
              </div>

              {/* Description */}
              {selectedItem.description && (
                <div className="p-4 bg-gray-50/50 dark:bg-zinc-900/30 rounded-2xl border border-gray-100 dark:border-zinc-800">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-gray-400 dark:text-zinc-500 block mb-1">
                    Descripción del Artículo
                  </span>
                  <p className="text-xs text-gray-700 dark:text-zinc-300 whitespace-pre-line leading-relaxed">
                    {selectedItem.description}
                  </p>
                </div>
              )}

              {/* Action Bar */}
              <div className="pt-4 border-t border-gray-100 dark:border-zinc-800 flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="flex items-center gap-2 w-full sm:w-auto">
                  <button
                    type="button"
                    onClick={(e) => handleCopyItemLink(selectedItem, e)}
                    className="w-full sm:w-auto px-4 py-2.5 bg-gray-100 dark:bg-zinc-800 text-gray-700 dark:text-zinc-300 hover:bg-gray-200 dark:hover:bg-zinc-700 rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer"
                  >
                    {copiedItemId === selectedItem.id ? <CheckIcon className="w-4 h-4 text-emerald-600" /> : <DocumentDuplicateIcon className="w-4 h-4" />}
                    <span>{copiedItemId === selectedItem.id ? 'Enlace Copiado' : 'Copiar Link'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={(e) => handleShareItemWhatsApp(selectedItem, e)}
                    className="w-full sm:w-auto px-5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-bold text-xs flex items-center justify-center gap-2 transition-all cursor-pointer shadow-sm"
                  >
                    <ChatBubbleLeftRightIcon className="w-4 h-4" />
                    <span>Consultar por WhatsApp</span>
                  </button>
                </div>

                <button
                  type="button"
                  onClick={handleCloseDetail}
                  className="w-full sm:w-auto px-5 py-2.5 bg-gray-900 dark:bg-white text-white dark:text-zinc-900 hover:bg-black dark:hover:bg-zinc-200 rounded-xl font-bold text-xs transition-all cursor-pointer"
                >
                  Cerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Public Footer */}
      {isPublic && (
        <footer className="bg-white dark:bg-[#12131a] border-t border-gray-200/80 dark:border-zinc-800 py-8 px-4 sm:px-6 lg:px-8 mt-12 text-center text-xs text-gray-500 dark:text-zinc-400">
          <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="font-black text-gray-900 dark:text-white">Brianna Heavy Equipment</span>
              <span>•</span>
              <span>Venta y Financiamiento de Equipos Pesados y Repuestos</span>
            </div>
            <p>© {new Date().getFullYear()} Brianna Heavy. Todos los derechos reservados.</p>
          </div>
        </footer>
      )}
    </div>
  );
}
