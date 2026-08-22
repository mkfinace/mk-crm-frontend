'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';
import EnquiryModal from '@/components/EnquiryModal';

type Variant = { id: string; name: string; fuelType: string; transmission: string; exShowroomPrice: number };
type Model = { id: string; name: string; variants: Variant[] };
type Brand = { id: string; name: string; models: Model[] };

export default function Home() {
  const [brands, setBrands] = useState<Brand[]>([]);
  const [loading, setLoading] = useState(true);
  const [modalOpen, setModalOpen] = useState(false);
  const [selected, setSelected] = useState<{ brandId?: string; modelId?: string; variantId?: string; label?: string }>({});

  useEffect(() => {
    api.getFullCatalogue()
      .then(setBrands)
      .catch(() => setBrands([]))
      .finally(() => setLoading(false));
  }, []);

  function openEnquiry(brand: Brand, model?: Model, variant?: Variant) {
    setSelected({
      brandId: brand.id,
      modelId: model?.id,
      variantId: variant?.id,
      label: [brand.name, model?.name, variant?.name].filter(Boolean).join(' '),
    });
    setModalOpen(true);
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-4 py-4 flex items-center justify-between">
          <h1 className="text-xl font-bold">MK Finance <span className="text-blue-600">Cars</span></h1>
          <button onClick={() => setModalOpen(true)} className="bg-blue-600 text-white px-4 py-2 rounded-lg font-medium text-sm">
            Get a Quote
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-8">
        <h2 className="text-2xl font-bold mb-1">Browse New Cars</h2>
        <p className="text-gray-500 mb-6">Real-time pricing, straight from our dealer network.</p>

        {loading && <p className="text-gray-400">Loading catalogue...</p>}

        {!loading && brands.length === 0 && (
          <div className="bg-white border rounded-xl p-8 text-center text-gray-500">
            No vehicles in the catalogue yet. Add brands/models/variants from the admin panel.
          </div>
        )}

        <div className="grid gap-6">
          {brands.map(brand => (
            <div key={brand.id} className="bg-white border rounded-xl p-5">
              <h3 className="text-lg font-bold mb-3">{brand.name}</h3>
              <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                {brand.models.map(model => (
                  <div key={model.id} className="border rounded-lg p-4">
                    <h4 className="font-semibold mb-2">{model.name}</h4>
                    {model.variants.length === 0 && <p className="text-xs text-gray-400">No variants added yet.</p>}
                    {model.variants.map(v => (
                      <div key={v.id} className="flex items-center justify-between py-1.5 border-t first:border-t-0">
                        <div>
                          <p className="text-sm font-medium">{v.name}</p>
                          <p className="text-xs text-gray-500">{v.fuelType} · {v.transmission}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-bold">₹{(v.exShowroomPrice / 100000).toFixed(2)}L</p>
                          <button onClick={() => openEnquiry(brand, model, v)} className="text-xs text-blue-600 font-medium">
                            Enquire →
                          </button>
                        </div>
                      </div>
                    ))}
                    {model.variants.length === 0 && (
                      <button onClick={() => openEnquiry(brand, model)} className="text-xs text-blue-600 font-medium mt-2">
                        Enquire about this model →
                      </button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </main>

      <EnquiryModal
        open={modalOpen}
        onClose={() => { setModalOpen(false); setSelected({}); }}
        brandId={selected.brandId}
        modelId={selected.modelId}
        variantId={selected.variantId}
        vehicleLabel={selected.label}
      />
    </div>
  );
}
