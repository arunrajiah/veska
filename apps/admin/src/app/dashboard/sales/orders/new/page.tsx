import Link from 'next/link';
import OrderForm from './order-form.js';

export default function NewSalesOrderPage() {
  return (
    <div className="px-8 py-8 max-w-3xl">
      <Link href="/dashboard/sales/orders" className="text-sm text-gray-500 hover:text-gray-900 mb-6 inline-block">
        ← Sales Orders
      </Link>
      <OrderForm />
    </div>
  );
}
