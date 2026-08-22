'use client';

import { useState } from 'react';
import { api } from '@/lib/api';

export default function EnquiryModal({
  open,
  onClose,
  brandId,
  modelId,
  variantId,
  vehicleLabel,
}: {
  open: boolean;
  onClose: () => void;
  brandId?: string;
  modelId?: string;
  variantId?: string;
  vehicleLabel?: string;
}) {
  const [step, setStep] = useState<'form' | 'otp' | 'done'>('form');
  const [name, setName] = useState('');
  const [mobile, setMobile] = useState('');
  const [city, setCity] = useState('');
  const [otp, setOtp] = useState('');
  const [devOtp, setDevOtp] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  async function handleSendOtp() {
    setError('');
    if (!name.trim() || !/^\d{10}$/.test(mobile)) {
      setError('Enter your name and a valid 10-digit mobile number.');
      return;
    }
    setLoading(true);
    try {
      const res = await api.requestOtp(mobile);
      setDevOtp(res.devOtp || ''); // dev-mode only; remove once real SMS gateway is wired up
      setStep('otp');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleVerifyAndSubmit() {
    setError('');
    if (otp.length !== 6) {
      setError('Enter the 6-digit OTP.');
      return;
    }
    setLoading(true);
    try {
      await api.verifyOtp(mobile, otp);
      await api.createLead({
        customerName: name,
        customerMobile: mobile,
        city,
        brandId,
        modelId,
        variantId,
        source: 'WEBSITE',
      });
      setStep('done');
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl max-w-sm w-full p-6 relative">
        <button onClick={onClose} className="absolute top-3 right-4 text-gray-400 text-xl">✕</button>

        {vehicleLabel && <p className="text-xs text-gray-500 mb-1">Enquiring about</p>}
        {vehicleLabel && <p className="font-semibold mb-3">{vehicleLabel}</p>}

        {step === 'form' && (
          <>
            <h3 className="text-lg font-bold mb-4">Get a Callback</h3>
            <input className="w-full border rounded-lg p-3 mb-3" placeholder="Your Name" value={name} onChange={e => setName(e.target.value)} />
            <input className="w-full border rounded-lg p-3 mb-3" placeholder="Mobile Number" value={mobile} onChange={e => setMobile(e.target.value)} maxLength={10} />
            <input className="w-full border rounded-lg p-3 mb-3" placeholder="City (optional)" value={city} onChange={e => setCity(e.target.value)} />
            {error && <p className="text-red-600 text-sm mb-2">{error}</p>}
            <button disabled={loading} onClick={handleSendOtp} className="w-full bg-blue-600 text-white rounded-lg p-3 font-semibold disabled:opacity-60">
              {loading ? 'Sending...' : 'Send OTP'}
            </button>
          </>
        )}

        {step === 'otp' && (
          <>
            <h3 className="text-lg font-bold mb-2">Verify OTP</h3>
            <p className="text-sm text-gray-500 mb-3">OTP sent to {mobile}</p>
            {devOtp && (
              <p className="text-xs bg-yellow-50 border border-yellow-200 rounded p-2 mb-3">
                Dev mode — no SMS gateway connected yet. Your OTP is: <b>{devOtp}</b>
              </p>
            )}
            <input className="w-full border rounded-lg p-3 mb-3 tracking-widest text-center text-lg" placeholder="000000" value={otp} onChange={e => setOtp(e.target.value)} maxLength={6} />
            {error && <p className="text-red-600 text-sm mb-2">{error}</p>}
            <button disabled={loading} onClick={handleVerifyAndSubmit} className="w-full bg-blue-600 text-white rounded-lg p-3 font-semibold disabled:opacity-60">
              {loading ? 'Submitting...' : 'Verify & Submit'}
            </button>
          </>
        )}

        {step === 'done' && (
          <div className="text-center py-6">
            <div className="text-4xl mb-3">✅</div>
            <h3 className="text-lg font-bold mb-2">Thank you, {name}!</h3>
            <p className="text-sm text-gray-500 mb-4">Our team will contact you shortly.</p>
            <button onClick={onClose} className="bg-gray-100 rounded-lg px-4 py-2 font-medium">Close</button>
          </div>
        )}
      </div>
    </div>
  );
}
