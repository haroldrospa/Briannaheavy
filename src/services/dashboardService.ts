import { getLocalStorageInvoices, fetchInvoices, type Invoice } from './invoicesService';
import { getLocalStorageCustomers, fetchCustomers, type Customer } from './customersService';
import { getLocalStorageInventory, fetchInventory, type InventoryItem } from './inventoryService';
import { getLocalStorageFinancings, fetchFinancings, type Financing } from './financingService';

export interface DashboardMetrics {
  totalSalesMonth: number;
  totalCustomers: number;
  totalInventoryItems: number;
  activeFinancingsCount: number;
  activeFinancingAmount: number;
  monthlySalesChart: { month: string; sales: number }[];
  paymentMethodsChart: { name: string; value: number; color: string }[];
  topProductsChart: { name: string; sales: number }[];
  recentInvoices: Invoice[];
}

export const computeDashboardMetrics = (
  invoices: Invoice[],
  customers: Customer[],
  inventory: InventoryItem[],
  financings: Financing[]
): DashboardMetrics => {
  // Metrics
  const totalSalesMonth = invoices.reduce((sum, inv) => sum + (Number(inv.total_amount) || 0), 0);
  const totalCustomers = customers.length;
  const totalInventoryItems = inventory.reduce((sum, item) => sum + (Number(item.stock) || 1), 0);
  const activeFinancings = financings.filter(f => f.status === 'Activo');
  const activeFinancingAmount = activeFinancings.reduce((sum, f) => sum + (Number(f.financed_amount) || 0), 0);

  // Payment methods chart calculation
  const methodCounts: Record<string, number> = {};
  invoices.forEach(inv => {
    const method = inv.payment_method || 'Efectivo';
    methodCounts[method] = (methodCounts[method] || 0) + (Number(inv.total_amount) || 0);
  });

  const paymentMethodsChart = [
    { name: 'Efectivo', value: methodCounts['Efectivo'] || 0, color: '#10B981' },
    { name: 'Tarjeta', value: methodCounts['Tarjeta'] || 0, color: '#3B82F6' },
    { name: 'Transferencia', value: methodCounts['Transferencia'] || 0, color: '#8B5CF6' },
    { name: 'Crédito', value: methodCounts['Crédito'] || 0, color: '#F59E0B' },
  ];

  // Monthly sales chart calculation
  const monthsOrder = ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'];
  const monthlySalesMap: Record<string, number> = {};

  invoices.forEach(inv => {
    if (inv.created_at) {
      const date = new Date(inv.created_at);
      const monthName = monthsOrder[date.getMonth()];
      monthlySalesMap[monthName] = (monthlySalesMap[monthName] || 0) + (Number(inv.total_amount) || 0);
    }
  });

  const monthlySalesChart = monthsOrder.slice(0, 8).map(month => ({
    month,
    sales: monthlySalesMap[month] || (month === 'Ago' ? totalSalesMonth : 0),
  }));

  // Top products chart
  const topProductsChart = inventory.slice(0, 4).map(item => ({
    name: item.name,
    sales: Math.floor((Number(item.price) || 0) * (Number(item.stock) || 1)),
  }));

  return {
    totalSalesMonth,
    totalCustomers,
    totalInventoryItems,
    activeFinancingsCount: activeFinancings.length,
    activeFinancingAmount,
    monthlySalesChart,
    paymentMethodsChart,
    topProductsChart,
    recentInvoices: invoices.slice(0, 5),
  };
};

export const getCachedDashboardMetrics = (): DashboardMetrics => {
  const invoices = getLocalStorageInvoices();
  const customers = getLocalStorageCustomers();
  const inventory = getLocalStorageInventory();
  const financings = getLocalStorageFinancings();
  return computeDashboardMetrics(invoices, customers, inventory, financings);
};

// Module-level TTL cache — avoids 4 parallel Supabase queries on every Dashboard mount
let _dashboardCache: { data: DashboardMetrics; ts: number } | null = null;
const DASHBOARD_CACHE_TTL = 30_000; // 30 seconds

export const fetchDashboardMetrics = async (forceRefresh = false): Promise<DashboardMetrics> => {
  const now = Date.now();
  if (!forceRefresh && _dashboardCache && (now - _dashboardCache.ts) < DASHBOARD_CACHE_TTL) {
    return _dashboardCache.data;
  }

  const [invoices, customers, inventory, financings] = await Promise.all([
    fetchInvoices(),
    fetchCustomers(),
    fetchInventory(),
    fetchFinancings()
  ]);

  const data = computeDashboardMetrics(invoices, customers, inventory, financings);
  _dashboardCache = { data, ts: Date.now() };
  return data;
};
