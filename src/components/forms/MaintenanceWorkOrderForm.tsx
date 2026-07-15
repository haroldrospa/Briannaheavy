import { PrinterIcon, WrenchScrewdriverIcon, CheckCircleIcon, CalendarDaysIcon, UserIcon, CheckBadgeIcon } from '@heroicons/react/24/outline';

export default function MaintenanceWorkOrderForm() {
  return (
    <div className="w-full bg-[#f4f3f1] print:bg-white print:w-full print:m-0 print:p-0 min-h-[900px] flex flex-col rounded-[2.5rem] print:rounded-none overflow-hidden">
      
      {/* Header Actions */}
      <div className="flex justify-end p-6 border-b border-gray-200/60 bg-white print:hidden shrink-0">
        <button 
          onClick={() => window.print()}
          className="flex items-center gap-2 bg-[#ED1C24] text-white px-6 py-2.5 rounded-full font-bold hover:bg-red-700 transition-all shadow-sm hover:shadow-md"
        >
          <PrinterIcon className="h-5 w-5" />
          Imprimir / Guardar PDF
        </button>
      </div>

      <div className="mx-auto w-full max-w-4xl p-8 sm:p-12 font-sans flex-1 flex flex-col print:max-w-none print:p-0">
        
        {/* Document Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between mb-10 pb-8 border-b border-gray-200 print:border-gray-900">
          <div className="flex items-center gap-4 mb-4 sm:mb-0">
            <div className="h-14 w-14 rounded-2xl bg-red-100 flex items-center justify-center print:border print:border-gray-900 print:bg-transparent">
              <WrenchScrewdriverIcon className="h-8 w-8 text-[#ED1C24] print:text-black" />
            </div>
            <div>
              <h1 className="text-2xl font-black text-gray-900 tracking-tight">
                Orden de Trabajo
              </h1>
              <p className="text-sm font-medium text-gray-500">Mantenimiento de Equipos</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3 bg-white p-4 rounded-2xl shadow-sm border border-gray-100 print:shadow-none print:border-none print:p-0">
            <span className="text-sm font-bold text-gray-500">Nº de Control</span>
            <input 
              type="text" 
              className="text-xl font-black text-[#ED1C24] outline-none w-24 text-right bg-transparent placeholder-red-200 print:text-black" 
              placeholder="0016" 
            />
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Left Column (Metadata) */}
          <div className="lg:col-span-1 space-y-6">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 space-y-6 print:shadow-none print:border-gray-900 print:rounded-none">
              
              <div className="space-y-3">
                <label className="flex items-center gap-2 text-sm font-bold text-gray-700">
                  <WrenchScrewdriverIcon className="h-4 w-4 text-gray-400" />
                  Tipo de Mantenimiento
                </label>
                <div className="flex bg-[#f4f3f1] p-1 rounded-xl print:bg-transparent print:border print:border-gray-900 print:rounded-none">
                  <label className="flex-1 relative">
                    <input type="radio" name="maint_type" className="peer sr-only" defaultChecked />
                    <div className="text-center py-2 text-sm font-bold text-gray-500 peer-checked:text-gray-900 peer-checked:bg-white peer-checked:shadow-sm rounded-lg transition-all cursor-pointer print:peer-checked:bg-transparent print:peer-checked:shadow-none">
                      Interno
                    </div>
                  </label>
                  <label className="flex-1 relative">
                    <input type="radio" name="maint_type" className="peer sr-only" />
                    <div className="text-center py-2 text-sm font-bold text-gray-500 peer-checked:text-gray-900 peer-checked:bg-white peer-checked:shadow-sm rounded-lg transition-all cursor-pointer print:peer-checked:bg-transparent print:peer-checked:shadow-none">
                      Externo
                    </div>
                  </label>
                </div>
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-bold text-gray-700">
                  <CheckCircleIcon className="h-4 w-4 text-gray-400" />
                  Tipo de Servicio
                </label>
                <input 
                  type="text" 
                  className="w-full px-4 py-3 bg-[#f4f3f1] border-none rounded-xl text-sm font-medium text-gray-900 focus:ring-2 focus:ring-[#ED1C24]/20 outline-none transition-all print:bg-transparent print:border-b print:border-gray-400 print:rounded-none print:px-0" 
                  placeholder="Ej. Cambio de Aceite"
                />
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-bold text-gray-700">
                  <UserIcon className="h-4 w-4 text-gray-400" />
                  Asignado a
                </label>
                <input 
                  type="text" 
                  className="w-full px-4 py-3 bg-[#f4f3f1] border-none rounded-xl text-sm font-medium text-gray-900 focus:ring-2 focus:ring-[#ED1C24]/20 outline-none transition-all print:bg-transparent print:border-b print:border-gray-400 print:rounded-none print:px-0" 
                  placeholder="Nombre del Técnico"
                />
              </div>

              <div className="space-y-2">
                <label className="flex items-center gap-2 text-sm font-bold text-gray-700">
                  <CalendarDaysIcon className="h-4 w-4 text-gray-400" />
                  Fecha de Realización
                </label>
                <input 
                  type="date" 
                  className="w-full px-4 py-3 bg-[#f4f3f1] border-none rounded-xl text-sm font-medium text-gray-900 focus:ring-2 focus:ring-[#ED1C24]/20 outline-none transition-all print:bg-transparent print:border-b print:border-gray-400 print:rounded-none print:px-0" 
                />
              </div>

            </div>
          </div>

          {/* Right Column (Work Done & Signatures) */}
          <div className="lg:col-span-2 flex flex-col gap-8">
            <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 flex-1 flex flex-col print:shadow-none print:border-gray-900 print:rounded-none">
              <label className="flex items-center gap-2 text-base font-black text-gray-900 mb-4">
                <CheckBadgeIcon className="h-5 w-5 text-[#ED1C24] print:text-black" />
                Trabajo Realizado
              </label>
              <textarea 
                className="flex-1 w-full bg-[#f4f3f1] rounded-2xl p-6 outline-none resize-none font-medium text-gray-900 focus:ring-2 focus:ring-[#ED1C24]/20 transition-all print:bg-transparent print:border print:border-gray-400 print:rounded-none print:p-4 min-h-[300px]"
                placeholder="Describa detalladamente el trabajo realizado..."
              ></textarea>
            </div>

            {/* Signatures */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 print:gap-8">
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 print:shadow-none print:border-gray-900 print:rounded-none">
                <h4 className="text-sm font-bold text-gray-500 mb-12">Verificado y Liberado por</h4>
                <div className="space-y-4">
                  <div className="border-b-2 border-dashed border-gray-300 print:border-solid print:border-gray-900"></div>
                  <div className="flex justify-between text-xs font-bold text-gray-400">
                    <span>Nombre y Firma</span>
                    <span>Fecha</span>
                  </div>
                </div>
              </div>

              <div className="bg-white p-6 rounded-3xl shadow-sm border border-gray-100 print:shadow-none print:border-gray-900 print:rounded-none">
                <h4 className="text-sm font-bold text-gray-500 mb-12">Aprobado por</h4>
                <div className="space-y-4">
                  <div className="border-b-2 border-dashed border-gray-300 print:border-solid print:border-gray-900"></div>
                  <div className="flex justify-between text-xs font-bold text-gray-400">
                    <span>Nombre y Firma</span>
                    <span>Fecha</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

        </div>
        
      </div>
    </div>
  );
}
