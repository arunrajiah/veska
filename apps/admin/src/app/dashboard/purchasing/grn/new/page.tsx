import GRNForm from './grn-form.js';

export default function NewGRNPage() {
  return (
    <div className="px-8 py-8 max-w-3xl">
      <h1 className="text-2xl font-semibold text-gray-900 mb-6">New Goods Received Note</h1>
      <GRNForm />
    </div>
  );
}
