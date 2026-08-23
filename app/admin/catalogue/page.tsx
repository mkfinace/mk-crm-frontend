'use client';

import { useEffect, useState } from 'react';
import { api } from '@/lib/api';

export default function CatalogueAdminPage() {
  const [catalogue, setCatalogue] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);

  // New brand form
  const [brandName, setBrandName] = useState('');
  const [brandLogo, setBrandLogo] = useState('');

  // New model form
  const [modelBrandId, setModelBrandId] = useState('');
  const [modelName, setModelName] = useState('');

  // New variant form
  const [variantModelId, setVariantModelId] = useState('');
  const [variantName, setVariantName] = useState('');
  const [variantFuel, setVariantFuel] = useState('Petrol');
  const [variantTransmission, setVariantTransmission] = useState('Manual');
  const [variantPrice, setVariantPrice] = useState('');

  useEffect(() => {
    loadCatalogue();
  }, []);

  async function loadCatalogue() {
    setLoading(true);
    setError('');
    try {
      const data = await api.getFullCatalogue();
      setCatalogue(data);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleAddBrand(e: React.FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError('');
    try {
      await api.createBrand({ name: brandName, logoUrl: brandLogo || undefined });
      setBrandName('');
      setBrandLogo('');
      await loadCatalogue();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleAddModel(e: React.FormEvent) {
    e.preventDefault();
    if (!modelBrandId) {
      setError('Select a brand first.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await api.createModel({ brandId: modelBrandId, name: modelName });
      setModelName('');
      await loadCatalogue();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  async function handleAddVariant(e: React.FormEvent) {
    e.preventDefault();
    if (!variantModelId) {
      setError('Select a model first.');
      return;
    }
    setSaving(true);
    setError('');
    try {
      await api.createVariant({
        modelId: variantModelId,
        name: variantName,
        fuelType: variantFuel,
        transmission: variantTransmission,
        exShowroomPrice: Number(variantPrice),
      });
      setVariantName('');
      setVariantPrice('');
      await loadCatalogue();
    } catch (e: any) {
      setError(e.message);
    } finally {
      setSaving(false);
    }
  }

  const allModels = catalogue.flatMap((b) => b.models.map((m: any) => ({ ...m, brandName: b.name })));

  return (
    <div className="max-w-4xl">
      <h1 className="text-xl font-bold mb-6">Catalogue Management</h1>

      {error && <p className="text-red-600 text-sm mb-4">{error}</p>}

      <div className="grid grid-cols-3 gap-4 mb-8">
        {/* Add Brand */}
        <div className="bg-white rounded-xl border p-4">
          <p className="font-semibold mb-3">Add Brand</p>
          <form onSubmit={handleAddBrand} className="space-y-2">
            <input
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="Brand name"
              value={brandName}
              onChange={(e) => setBrandName(e.target.value)}
              required
            />
            <input
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="Logo URL (optional)"
              value={brandLogo}
              onChange={(e) => setBrandLogo(e.target.value)}
            />
            <button disabled={saving} className="w-full bg-blue-600 text-white rounded-lg py-2 text-sm font-medium disabled:opacity-60">
              Add Brand
            </button>
          </form>
        </div>

        {/* Add Model */}
        <div className="bg-white rounded-xl border p-4">
          <p className="font-semibold mb-3">Add Model</p>
          <form onSubmit={handleAddModel} className="space-y-2">
            <select
              className="w-full border rounded-lg px-3 py-2 text-sm"
              value={modelBrandId}
              onChange={(e) => setModelBrandId(e.target.value)}
              required
            >
              <option value="">Select brand</option>
              {catalogue.map((b) => (
                <option key={b.id} value={b.id}>{b.name}</option>
              ))}
            </select>
            <input
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="Model name"
              value={modelName}
              onChange={(e) => setModelName(e.target.value)}
              required
            />
            <button disabled={saving} className="w-full bg-blue-600 text-white rounded-lg py-2 text-sm font-medium disabled:opacity-60">
              Add Model
            </button>
          </form>
        </div>

        {/* Add Variant */}
        <div className="bg-white rounded-xl border p-4">
          <p className="font-semibold mb-3">Add Variant</p>
          <form onSubmit={handleAddVariant} className="space-y-2">
            <select
              className="w-full border rounded-lg px-3 py-2 text-sm"
              value={variantModelId}
              onChange={(e) => setVariantModelId(e.target.value)}
              required
            >
              <option value="">Select model</option>
              {allModels.map((m) => (
                <option key={m.id} value={m.id}>{m.brandName} {m.name}</option>
              ))}
            </select>
            <input
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="Variant name (e.g. VXI)"
              value={variantName}
              onChange={(e) => setVariantName(e.target.value)}
              required
            />
            <div className="grid grid-cols-2 gap-2">
              <select className="border rounded-lg px-2 py-2 text-sm" value={variantFuel} onChange={(e) => setVariantFuel(e.target.value)}>
                <option>Petrol</option>
                <option>Diesel</option>
                <option>CNG</option>
                <option>Electric</option>
              </select>
              <select className="border rounded-lg px-2 py-2 text-sm" value={variantTransmission} onChange={(e) => setVariantTransmission(e.target.value)}>
                <option>Manual</option>
                <option>Automatic</option>
              </select>
            </div>
            <input
              type="number"
              className="w-full border rounded-lg px-3 py-2 text-sm"
              placeholder="Ex-showroom price"
              value={variantPrice}
              onChange={(e) => setVariantPrice(e.target.value)}
              required
            />
            <button disabled={saving} className="w-full bg-blue-600 text-white rounded-lg py-2 text-sm font-medium disabled:opacity-60">
              Add Variant
            </button>
          </form>
        </div>
      </div>

      {/* Current catalogue */}
      <p className="font-semibold mb-3">Current Catalogue</p>
      {loading && <p className="text-gray-500 text-sm">Loading...</p>}
      {!loading && catalogue.length === 0 && <p className="text-gray-500 text-sm">No brands yet.</p>}
      <div className="space-y-4">
        {catalogue.map((brand) => (
          <div key={brand.id} className="bg-white rounded-xl border p-4">
            <p className="font-bold mb-2">{brand.name}</p>
            {brand.models.length === 0 && <p className="text-sm text-gray-400">No models yet.</p>}
            <div className="space-y-2">
              {brand.models.map((model: any) => (
                <div key={model.id} className="pl-4 border-l-2">
                  <p className="font-medium text-sm">{model.name}</p>
                  {model.variants?.length === 0 && <p className="text-xs text-gray-400">No variants yet.</p>}
                  <div className="flex flex-wrap gap-2 mt-1">
                    {model.variants?.map((v: any) => (
                      <span key={v.id} className="text-xs bg-gray-100 rounded-full px-3 py-1">
                        {v.name} · {v.fuelType} · {v.transmission} · ₹{(v.exShowroomPrice / 100000).toFixed(2)}L
                      </span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
