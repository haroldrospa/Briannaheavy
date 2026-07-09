import { PrinterIcon } from '@heroicons/react/24/outline';

export default function MaintenanceWorkOrderForm() {
  return (
    <div className="w-full bg-white print:w-full print:m-0 print:p-0 min-h-[900px] flex flex-col">
      
      <div className="flex justify-end mb-4 print:hidden shrink-0">
        <button 
          onClick={() => window.print()}
          className="flex items-center gap-2 bg-[#ED1C24] text-white px-5 py-2.5 rounded-full font-bold hover:bg-red-700 transition-colors shadow-sm"
        >
          <PrinterIcon className="h-5 w-5" />
          Imprimir / Guardar PDF
        </button>
      </div>

      <div className="mx-auto w-full max-w-4xl font-sans flex-1 flex flex-col print:max-w-none" style={{ color: '#2c3e50' }}>
        
        {/* Header */}
        <div className="mb-8 border-b-2 border-gray-400 pb-4 relative">
          {/* Top aesthetic lines */}
          <div className="absolute top-0 left-0 w-32 h-6 border-l-2 border-t-2 border-gray-400"></div>
          <div className="absolute top-2 left-2 w-32 h-6 border-l-2 border-t-2 border-gray-400"></div>
          <div className="absolute top-4 left-4 w-32 h-6 border-l-2 border-t-2 border-gray-400"></div>
          
          <h1 className="text-2xl sm:text-3xl font-black text-center mt-12 mb-4 tracking-wider text-[#2c3e50]">
            ORDEN DE TRABAJO DE MANTENIMIENTO
          </h1>
          
          <div className="flex justify-end items-center mr-8">
            <span className="font-bold text-gray-700 mr-2">Numero de control:</span>
            <input type="text" className="text-xl font-bold text-red-600 outline-none w-24 text-right" placeholder="0016" />
          </div>
        </div>

        {/* Info Table */}
        <div className="border border-gray-900 rounded-sm mb-4 text-sm font-bold">
          <div className="flex border-b border-gray-900">
            <div className="w-1/3 p-3 border-r border-gray-900 bg-gray-50/50">
              Mantenimiento
            </div>
            <div className="w-2/3 flex">
              <label className="flex-1 p-3 border-r border-gray-900 flex items-center justify-center gap-2 cursor-pointer hover:bg-gray-50 transition-colors">
                <input type="radio" name="maintenance_type" className="w-4 h-4 text-[#ED1C24] focus:ring-[#ED1C24]" />
                Interno
              </label>
              <label className="flex-1 p-3 flex items-center justify-center gap-2 cursor-pointer hover:bg-gray-50 transition-colors">
                <input type="radio" name="maintenance_type" className="w-4 h-4 text-[#ED1C24] focus:ring-[#ED1C24]" />
                Externo
              </label>
            </div>
          </div>
          
          <div className="flex border-b border-gray-900">
            <div className="w-1/3 p-3 border-r border-gray-900 bg-gray-50/50">
              Tipo de servicio
            </div>
            <div className="w-2/3">
              <input type="text" className="w-full h-full p-3 outline-none uppercase font-medium text-[#2c3e50]" />
            </div>
          </div>

          <div className="flex">
            <div className="w-1/3 p-3 border-r border-gray-900 bg-gray-50/50">
              Asignado a
            </div>
            <div className="w-2/3">
              <input type="text" className="w-full h-full p-3 outline-none uppercase font-medium text-[#2c3e50]" />
            </div>
          </div>
        </div>

        {/* Work Done Text Area */}
        <div className="border border-gray-900 rounded-sm flex-1 flex flex-col min-h-[400px]">
          <div className="flex border-b border-gray-900 font-bold text-sm bg-gray-50/50">
            <div className="w-1/3 p-3">Fecha de realizacion</div>
            <div className="w-2/3">
              <input type="date" className="w-full h-full p-3 outline-none font-medium text-[#2c3e50] bg-transparent" />
            </div>
          </div>
          
          <div className="p-4 flex-1 flex flex-col">
            <h3 className="font-bold text-sm mb-2 text-[#2c3e50]">Trabajo Realizado</h3>
            <textarea 
              className="flex-1 w-full outline-none resize-none font-medium text-[#2c3e50] p-2"
              placeholder="Describa el trabajo realizado aquí..."
            ></textarea>
          </div>

          {/* Signatures Footer */}
          <div className="mt-auto">
            <div className="flex border-t border-gray-900 font-bold text-sm">
              <div className="w-1/2 p-4 border-r border-gray-900 bg-gray-50/50 flex flex-col justify-between">
                <span className="mb-8">Verificado y Liberado por</span>
                <input type="text" className="w-full border-b border-gray-400 outline-none bg-transparent" />
              </div>
              <div className="w-1/2 p-4 bg-gray-50/50 flex flex-col justify-between">
                <span className="mb-8">Fecha y Firma</span>
                <input type="text" className="w-full border-b border-gray-400 outline-none bg-transparent" />
              </div>
            </div>
            
            <div className="flex border-t border-gray-900 font-bold text-sm">
              <div className="w-1/2 p-4 border-r border-gray-900 bg-gray-50/50 flex flex-col justify-between">
                <span className="mb-8">Aprobado por</span>
                <input type="text" className="w-full border-b border-gray-400 outline-none bg-transparent" />
              </div>
              <div className="w-1/2 p-4 bg-gray-50/50 flex flex-col justify-between">
                <span className="mb-8">Fecha y Firma</span>
                <input type="text" className="w-full border-b border-gray-400 outline-none bg-transparent" />
              </div>
            </div>
          </div>
        </div>
        
      </div>
    </div>
  );
}
