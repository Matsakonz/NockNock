import { useState, useMemo, useEffect, useRef } from 'react';
import { 
  Pencil, Plus, X, Receipt, CheckCircle2, 
  User, Calendar, ChevronDown, ChevronUp, 
  Utensils, Car, Home, ShoppingBag, Check, Trash2, Camera, 
  Image as ImageIcon, Menu, CloudOff, RefreshCw, CreditCard
} from 'lucide-react';

// --- Supabase Cloud Imports ---
import { createClient } from '@supabase/supabase-js';
import Swal from 'sweetalert2';

const CATEGORIES = [
  { id: 'food', name: 'Food', icon: Utensils },
  { id: 'transport', name: 'Transport', icon: Car },
  { id: 'housing', name: 'Housing', icon: Home },
  { id: 'shopping', name: 'Shopping', icon: ShoppingBag },
  { id: 'settlement', name: 'Settlement', icon: CheckCircle2 },
  { id: 'general', name: 'General', icon: Receipt },
];

// ----------------------------------------------------
// UI Components
// ----------------------------------------------------
const FloatingInput = ({ label, type = "text", value, onChange, placeholder = "", icon: Icon, required = false, typeInput = "input", children, disabled = false, name }) => (
  <div className={`relative border border-gray-200 rounded-2xl px-4 py-3 transition-colors flex items-center ${disabled ? 'bg-gray-50' : 'bg-white focus-within:border-gray-900'}`}>
    <label className={`absolute -top-2.5 left-4 px-1 text-xs font-medium z-10 ${disabled ? 'bg-gray-50 text-gray-400' : 'bg-white text-gray-500'}`}>{label}{required && '*'}</label>
    {typeInput === "input" ? (
      <input name={name} type={type} required={required} disabled={disabled} value={value} onChange={onChange} placeholder={placeholder} step={type === "number" ? "any" : undefined} className={`w-full outline-none text-sm font-medium ${disabled ? 'text-gray-500 bg-transparent' : 'text-gray-900 bg-transparent placeholder-gray-300'}`} />
    ) : (
      <select name={name} required={required} disabled={disabled} value={value} onChange={onChange} className="w-full outline-none text-sm font-medium text-gray-900 bg-transparent appearance-none cursor-pointer">
        {children}
      </select>
    )}
    {Icon && <Icon className="absolute right-4 w-4 h-4 text-gray-400 pointer-events-none" />}
  </div>
);

const CustomDropdown = ({ label, value, options, onChange, icon: Icon, disabled }) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  useEffect(() => {
    function handleClickOutside(event) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) setIsOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selectedOption = options.find(o => o.value === value);

  return (
    <div className={`relative border border-gray-200 rounded-2xl px-4 py-3 transition-colors flex items-center cursor-pointer ${disabled ? 'bg-gray-50' : 'bg-white focus-within:border-gray-900'}`} ref={dropdownRef} onClick={() => !disabled && setIsOpen(!isOpen)}>
      <label className={`absolute -top-2.5 left-4 px-1 text-xs font-medium z-10 ${disabled ? 'bg-gray-50 text-gray-400' : 'bg-white text-gray-500'}`}>{label}</label>
      <div className={`w-full flex items-center justify-between text-sm font-medium ${disabled ? 'text-gray-500' : 'text-gray-900'}`}>
        <span className="truncate">{selectedOption ? selectedOption.label : 'Select...'}</span>
        {Icon ? <Icon className="w-4 h-4 text-gray-400" /> : <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />}
      </div>
      
      {isOpen && !disabled && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-100 shadow-xl rounded-2xl z-50 py-2 max-h-48 overflow-y-auto animate-in fade-in slide-in-from-top-2">
          {options.map((opt) => (
            <div 
              key={opt.value} 
              onClick={(e) => { e.stopPropagation(); onChange(opt.value); setIsOpen(false); }}
              className={`px-4 py-2.5 text-sm hover:bg-gray-50 cursor-pointer flex items-center justify-between ${value === opt.value ? 'font-bold bg-gray-50' : 'font-medium text-gray-700'}`}
            >
              <div className="flex items-center gap-2">
                {opt.icon && <opt.icon className="w-4 h-4 text-gray-400" />}
                {opt.label}
              </div>
              {value === opt.value && <Check className="w-4 h-4 text-gray-900" />}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const resizeImage = (file) => {
  return new Promise((resolve) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target.result;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 800;
        const MAX_HEIGHT = 800;
        let width = img.width;
        let height = img.height;
        if (width > height) { if (width > MAX_WIDTH) { height *= MAX_WIDTH / width; width = MAX_WIDTH; } } 
        else { if (height > MAX_HEIGHT) { width *= MAX_HEIGHT / height; height = MAX_HEIGHT; } }
        canvas.width = width; canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0, width, height);
        resolve(canvas.toDataURL('image/jpeg', 0.6));
      };
    };
  });
};

export default function App() {
  // ----------------------------------------------------
  // Cloud DB States
  // ----------------------------------------------------
  const [db, setDb] = useState(null);
  const [isLoadingDB, setIsLoadingDB] = useState(true);
  const [isCloudConnected, setIsCloudConnected] = useState(false);

  // App States
  const [tripsData, setTripsData] = useState({ activeTripId: null, trips: {} });

  // 1. Initialize Supabase Connection
  useEffect(() => {
    if (typeof window.__supabase_config === 'undefined') {
      setTimeout(() => {
        setIsLoadingDB(false);
        const saved = localStorage.getItem('whopay_trips_v7');
        if (saved) setTripsData(JSON.parse(saved));
      }, 0);
      return;
    }

    try {
      console.log("Supabase Config from window:", window.__supabase_config);
      if (!window.__supabase_config) {
        console.error("Supabase config is missing from window object.");
        setTimeout(() => setIsLoadingDB(false), 0);
        return;
      }

      // Handle case where config might already be an object (Vite's define often does this)
      const config = typeof window.__supabase_config === 'string' 
        ? JSON.parse(window.__supabase_config) 
        : window.__supabase_config;

      console.log("Initializing Supabase with URL:", config.url);
      
      if (!config.url || config.url.includes('YOUR_SUPABASE_URL_HERE')) {
        console.error("Supabase URL is invalid or default.");
        setTimeout(() => setIsLoadingDB(false), 0);
        return;
      }

      const supabase = createClient(config.url, config.anonKey);
      setTimeout(() => setDb(supabase), 0);
      console.log("Supabase client initialized.");
      setTimeout(() => setIsCloudConnected(true), 0);
    } catch(e) { 
      console.error("Supabase Initialization Error:", e); 
      setTimeout(() => setIsLoadingDB(false), 0); 
    }
  }, []);

  // 2. Sync Real-time Data
  useEffect(() => {
    if (!db) return;
    const appId = typeof window.__app_id !== 'undefined' ? window.__app_id : 'default-app-id';

    const fetchTrips = async () => {
      const { data, error } = await db
        .from('trips')
        .select('*')
        .eq('app_id', appId);

      if (error) {
        console.error("Fetch Error from Supabase:", error.message, error.details, error.hint);
        setTimeout(() => setIsLoadingDB(false), 0);
        setIsCloudConnected(false);
        return;
      }
      console.log("Fetched trips from Supabase:", data.length);

      const fetched = {};
      data.forEach(item => {
        fetched[item.id] = {
          id: item.id,
          info: item.info,
          members: item.members,
          expenses: item.expenses,
          createdAt: item.created_at
        };
      });
      
      setTripsData(prev => {
        // Restore activeTripId from localStorage if it exists and is still valid
        const savedActiveId = localStorage.getItem('whopay_active_trip_id');
        let activeId = (savedActiveId && fetched[savedActiveId]) ? savedActiveId : prev.activeTripId;
        
        if (!activeId || !fetched[activeId]) {
          activeId = Object.keys(fetched)[0] || null;
        }
        
        if (activeId) localStorage.setItem('whopay_active_trip_id', activeId);
        return { activeTripId: activeId, trips: fetched };
      });
      setTimeout(() => setIsLoadingDB(false), 0);
      setIsCloudConnected(true);
    };

    fetchTrips();

    // Subscribe to realtime changes
    console.log("Subscribing to realtime changes for app_id:", appId);
    const channel = db.channel('trips-changes')
      .on('postgres_changes', 
        { event: '*', schema: 'public', table: 'trips', filter: `app_id=eq.${appId}` }, 
        (payload) => {
          console.log("Realtime change received:", payload);
          fetchTrips();
        }
      )
      .subscribe((status) => {
        console.log("Realtime subscription status:", status);
      });

    return () => {
      db.removeChannel(channel);
    };
  }, [db]);

  // 3. (Removed automatic mockup data creation)

  // ----------------------------------------------------
  // App Logic & Accessors
  // ----------------------------------------------------
  const activeTrip = tripsData.trips[tripsData.activeTripId];
  const groupInfo = activeTrip?.info || { name: '', description: '' };
  const members = activeTrip?.members || [];
  const expenses = activeTrip?.expenses || [];

  // Data Mutation Function
  const updateActiveTrip = async (updates) => {
    if (!activeTrip) return;
    const updatedTrip = { ...activeTrip, ...updates };

    // Update Cloud DB
    if (db) {
      const appId = typeof window.__app_id !== 'undefined' ? window.__app_id : 'default-app-id';
      const { error } = await db.from('trips').upsert({
        id: updatedTrip.id,
        app_id: appId,
        info: updatedTrip.info,
        members: updatedTrip.members,
        expenses: updatedTrip.expenses,
        updated_at: new Date().toISOString()
      });
      if (error) console.error("Update Error:", error);
    } else {
      // Update Local
      setTripsData(prev => ({
        ...prev,
        trips: { ...prev.trips, [updatedTrip.id]: updatedTrip }
      }));
    }
  };

  // 4. LocalStorage Fallback Saving & Image Cleanup
  useEffect(() => {
    if (!db) localStorage.setItem('whopay_trips_v7', JSON.stringify(tripsData));
    
    // Auto-cleanup images older than 1 month
    if (activeTrip && activeTrip.expenses.some(e => e.image)) {
      const oneMonthAgo = new Date();
      oneMonthAgo.setMonth(oneMonthAgo.getMonth() - 1);
      
      let hasOldImages = false;
      const cleanedExpenses = activeTrip.expenses.map(exp => {
        if (exp.image && new Date(exp.date) < oneMonthAgo) {
          hasOldImages = true;
          const { image: _img, ...rest } = exp;
          return rest;
        }
        return exp;
      });

      if (hasOldImages) {
        console.log("Cleaning up images older than 1 month...");
        // Use a small delay to avoid state updates during render or other effects
        setTimeout(() => updateActiveTrip({ expenses: cleanedExpenses }), 1000);
      }
    }
  }, [tripsData, db, activeTrip?.id]);


  // UI States
  const [activeMainTab, setActiveMainTab] = useState('dashboard');
  const [activeModal, setActiveModal] = useState(null); 
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);
  const [expandedDebtId, setExpandedDebtId] = useState(null);
  const [selectedExpense, setSelectedExpense] = useState(null);
 
  const [editingExpenseId, setEditingExpenseId] = useState(null); 
  const [viewingImage, setViewingImage] = useState(null);

  // Form States
  const [newTripName, setNewTripName] = useState('');
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberPromptPay, setNewMemberPromptPay] = useState('');
  const [editMemberName, setEditMemberName] = useState('');
  const [editMemberPromptPay, setEditMemberPromptPay] = useState('');
  const [isEditingMember, setIsEditingMember] = useState(false);

  // Expense Form States
  const [expMode, setExpMode] = useState('quick');
  const [expDate, setExpDate] = useState(new Date().toISOString().split('T')[0]);
  const [expTitle, setExpTitle] = useState('');
  const [expCategory, setExpCategory] = useState('food');
  const [expAmount, setExpAmount] = useState('');
  const [expPayer, setExpPayer] = useState('');
  const [expInvolved, setExpInvolved] = useState([]);
  const [expNote, setExpNote] = useState('');
  const [expImage, setExpImage] = useState(null);
  
  // Split Bill Form States
  const [expBillItems, setExpBillItems] = useState([]);
  const [useDiscountFull, setUseDiscountFull] = useState(false);
  const [useDiscountPct, setUseDiscountPct] = useState(false);
  const [useSc, setUseSc] = useState(false);
  const [useVat, setUseVat] = useState(false);
  const [expDiscountFull, setExpDiscountFull] = useState('0');
  const [expDiscountPct, setExpDiscountPct] = useState('0');
  const [expServiceCharge, setExpServiceCharge] = useState('10');
  const [expVat, setExpVat] = useState('7');

  const [isShareDropdownOpen, setIsShareDropdownOpen] = useState(false);
  const shareDropdownRef = useRef(null);

  useEffect(() => {
    // Only default if members exist and expPayer is not yet set
    if (members.length > 0 && !expPayer) {
      setTimeout(() => {
        // Double check expPayer is still falsy after the timeout
        setExpPayer(prev => prev || members[0].id);
        setExpInvolved(prev => prev.length === 0 ? members.map(m => m.id) : prev);
      }, 0);
    }
  }, [members, expPayer]);

  useEffect(() => {
    function handleClickOutside(event) {
      if (shareDropdownRef.current && !shareDropdownRef.current.contains(event.target)) setIsShareDropdownOpen(false);
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // ----------------------------------------------------
  // Split Bill & Calculations
  // ----------------------------------------------------
  const calculateSplitBillData = (items, dFull, dPct, sc, vat, useDFull, useDPct, useSC, useVat) => {
    const subtotal = items.reduce((sum, item) => sum + Number(item.price || 0), 0);
    const discountAmt = (useDFull ? Number(dFull || 0) : 0) + (useDPct ? (subtotal * Number(dPct || 0) / 100) : 0);
    const afterDiscount = Math.max(0, subtotal - discountAmt);
    const scAmt = useSC ? (afterDiscount * Number(sc || 0) / 100) : 0;
    const vatAmt = useVat ? ((afterDiscount + scAmt) * Number(vat || 0) / 100) : 0;
    const total = afterDiscount + scAmt + vatAmt;
    const multiplier = subtotal > 0 ? total / subtotal : 1;
    return { subtotal, total, multiplier };
  };

  const splitBillCurrentTotal = useMemo(() => {
    if (expMode !== 'split') return 0;
    return calculateSplitBillData(expBillItems, expDiscountFull, expDiscountPct, expServiceCharge, expVat, useDiscountFull, useDiscountPct, useSc, useVat).total;
  }, [expBillItems, expDiscountFull, expDiscountPct, expServiceCharge, expVat, useDiscountFull, useDiscountPct, useSc, useVat, expMode]);

  useEffect(() => {
    if (expMode === 'split') {
      setTimeout(() => setExpAmount(splitBillCurrentTotal > 0 ? splitBillCurrentTotal.toString() : ''), 0);
    }
  }, [splitBillCurrentTotal, expMode]);

  const { totalExpense, balances, settlementHistory } = useMemo(() => {
    let total = 0;
    const history = {}; // { memberId: [ { type: 'paid'|'received', amount, partnerId, partnerName, image, date } ] }

    const stats = members.reduce((acc, m) => {
      acc[m.id] = { ...m, paid: 0, owed: 0, balance: 0, payTo: [], receiveFrom: [] };
      history[m.id] = [];
      return acc;
    }, {});

    expenses.forEach(exp => {
      const expTotal = exp.amount;
      
      // Track settlements separately for history view
      if (exp.category === 'settlement') {
        const payerId = exp.paidBy;
        const receiverId = exp.involved[0];
        const receiverName = members.find(m => m.id === receiverId)?.name || 'Unknown';
        const payerName = members.find(m => m.id === payerId)?.name || 'Unknown';

        if (history[payerId]) history[payerId].push({ type: 'paid', amount: expTotal, partnerId: receiverId, partnerName: receiverName, image: exp.image, date: exp.date, id: exp.id });
        if (history[receiverId]) history[receiverId].push({ type: 'received', amount: expTotal, partnerId: payerId, partnerName: payerName, image: exp.image, date: exp.date, id: exp.id });
      } else {
        // Only count actual expenses (non-settlements) towards the group total
        total += expTotal;
      }
      
      // Calculate who paid
      let payerId = exp.paidBy;
      // Fallback: if payer is missing or invalid, attribute to the first member 
      // to keep the total group balance at zero.
      if (!payerId || !stats[payerId]) {
        payerId = members[0]?.id;
      }
      
      if (stats[payerId]) stats[payerId].paid += expTotal;
      
      if (exp.mode === 'quick') {
        const splitAmount = exp.involved.length > 0 ? expTotal / exp.involved.length : 0;
        exp.involved.forEach(id => {
          if (stats[id]) stats[id].owed += splitAmount;
        });
      } else if (exp.mode === 'split') {
        // FIXED: Using exp.useVat instead of local state useVat
        const { multiplier } = calculateSplitBillData(
          exp.billItems, exp.discountFull, exp.discountPct, 
          exp.serviceCharge, exp.vat, exp.useDiscountFull, 
          exp.useDiscountPct, exp.useSc, exp.useVat
        );
        exp.billItems.forEach(item => {
          const finalItemPrice = Number(item.price || 0) * multiplier;
          const splitAmount = item.involved.length > 0 ? finalItemPrice / item.involved.length : 0;
          item.involved.forEach(id => {
            if (stats[id]) stats[id].owed += splitAmount;
          });
        });
      }
    });

    let calculatedBalances = Object.values(stats).map(stat => ({ ...stat, balance: stat.paid - stat.owed }));
    let debtors = calculatedBalances.filter(b => b.balance < -0.01).map(b => ({ ...b, debt: Math.abs(b.balance) }));
    let creditors = calculatedBalances.filter(b => b.balance > 0.01).map(b => ({ ...b, credit: b.balance }));
    
    let allSettlements = [];
    let d = 0, c = 0;

    while (d < debtors.length && c < creditors.length) {
      let debtor = debtors[d];
      let creditor = creditors[c];
      let amount = Math.min(debtor.debt, creditor.credit);
      
      if (amount > 0.01) {
        allSettlements.push({ fromId: debtor.id, toId: creditor.id, fromName: debtor.name, toName: creditor.name, amount });
      }

      debtor.debt -= amount;
      creditor.credit -= amount;
      if (debtor.debt < 0.01) d++;
      if (creditor.credit < 0.01) c++;
    }

    calculatedBalances.forEach(m => {
      m.payTo = allSettlements.filter(s => s.fromId === m.id);
      m.receiveFrom = allSettlements.filter(s => s.toId === m.id);
    });

    return { totalExpense: total, balances: calculatedBalances, settlementHistory: history };
  }, [members, expenses]);

  // ----------------------------------------------------
  // Interactions
  // ----------------------------------------------------
  const handleAddExpense = (e) => {
    e.preventDefault();
    const finalAmount = expMode === 'quick' ? Number(expAmount) : splitBillCurrentTotal;
    
    const newId = editingExpenseId || Date.now().toString();
    const newExp = {
      id: newId,
      title: expTitle, category: expCategory, amount: finalAmount, paidBy: expPayer, date: expDate,
      mode: expMode, note: expNote, image: expImage,
      involved: expMode === 'quick' ? expInvolved : [],
      billItems: expMode === 'split' ? expBillItems : [],
      discountFull: expDiscountFull, discountPct: expDiscountPct, serviceCharge: expServiceCharge, vat: expVat,
      useDiscountFull, useDiscountPct, useSc, useVat
    };
    
    let newExpenses;
    if (editingExpenseId) {
      newExpenses = expenses.map(e => e.id === editingExpenseId ? { ...e, ...newExp } : e);
    } else {
      newExpenses = [newExp, ...expenses];
    }
    
    updateActiveTrip({ expenses: newExpenses });
    resetExpenseForm();
    setActiveModal(null);
    setEditingExpenseId(null);
    if (!editingExpenseId) setActiveMainTab('expenses');
  };

  const handleDeleteExpense = (id) => {
    Swal.fire({
      title: 'ยืนยันการลบ?',
      text: "คุณต้องการลบบิลนี้ใช่หรือไม่? การกระทำนี้ไม่สามารถย้อนกลับได้",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#111827',
      cancelButtonColor: '#ef4444',
      confirmButtonText: 'ใช่, ลบเลย!',
      cancelButtonText: 'ยกเลิก',
      customClass: {
        popup: 'rounded-[2rem] font-sans',
        confirmButton: 'rounded-xl px-6 py-3 font-bold',
        cancelButton: 'rounded-xl px-6 py-3 font-bold'
      }
    }).then((result) => {
      if (result.isConfirmed) {
        updateActiveTrip({ expenses: expenses.filter(e => e.id !== id) });
        setActiveModal(null);
        Swal.fire({
          title: 'ลบแล้ว!',
          text: 'บิลของคุณถูกลบเรียบร้อยแล้ว',
          icon: 'success',
          timer: 1500,
          showConfirmButton: false,
          customClass: { popup: 'rounded-[2rem]' }
        });
      }
    });
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (file) {
      const resizedBase64 = await resizeImage(file);
      setExpImage(resizedBase64);
    }
  };

  const resetExpenseForm = () => {
    setExpTitle(''); setExpAmount(''); setExpNote(''); setExpCategory('food'); setExpMode('quick');
    setExpInvolved(members.map(m => m.id)); setExpBillItems([]); 
    setExpPayer(members[0]?.id || '');
    setUseDiscountFull(false); setUseDiscountPct(false); setUseSc(false); setUseVat(false);
    setExpDiscountFull('0'); setExpDiscountPct('0'); setExpServiceCharge('10'); setExpVat('7');
    setEditingExpenseId(null); setExpImage(null);
  };

  const openAddExpenseModal = () => { resetExpenseForm(); setActiveModal('addExpense'); };

  const openEditExpenseModal = (expense) => {
    setExpMode(expense.mode); setExpDate(expense.date); setExpTitle(expense.title); setExpCategory(expense.category);
    setExpAmount(expense.amount.toString()); setExpPayer(expense.paidBy); setExpInvolved(expense.involved || []);
    setExpNote(expense.note || ''); setExpBillItems(expense.billItems || []);
    setExpDiscountFull(expense.discountFull || '0'); setExpDiscountPct(expense.discountPct || '0');
    setExpServiceCharge(expense.serviceCharge || '10'); setExpVat(expense.vat || '7');
    setUseDiscountFull(expense.useDiscountFull || false); setUseDiscountPct(expense.useDiscountPct || false);
    setUseSc(expense.useSc || false); setUseVat(expense.useVat || false);
    setExpImage(expense.image || null); setEditingExpenseId(expense.id);
    setActiveModal('addExpense');
  };

  const openBillDetail = (expense) => { setSelectedExpense(expense); setActiveModal('billDetail'); };

  const toggleExpInvolved = (id) => {
    if (expInvolved.includes(id)) setExpInvolved(expInvolved.filter(i => i !== id));
    else setExpInvolved([...expInvolved, id]);
  };

  const isSaveDisabled = useMemo(() => {
    if (!expTitle.trim()) return true;
    if (Number(expAmount) <= 0) return true;
    if (!expPayer) return true;
    if (expMode === 'quick') return expInvolved.length === 0;
    else return expBillItems.length === 0 || expBillItems.some(i => !i.name.trim() || Number(i.price) <= 0 || i.involved.length === 0);
  }, [expTitle, expAmount, expInvolved, expMode, expBillItems, expPayer]);

  const handleAddMember = (e) => {
    e.preventDefault();
    const name = newMemberName.trim();
    const promptpay = newMemberPromptPay.trim();
    if (!name) return;
    const newMember = { 
      id: Date.now().toString(), 
      name: name, 
      promptpay: promptpay,
      avatarSeed: name + Date.now() 
    };
    updateActiveTrip({ members: [...activeTrip.members, newMember] });
    setNewMemberName('');
    setNewMemberPromptPay('');
    setActiveModal(null);
  };

  const handleDeleteMember = () => {
    if (!selectedMember) return;
    const isUsed = expenses.some(e => e.paidBy === selectedMember.id || (e.mode === 'quick' && e.involved.includes(selectedMember.id)) || (e.mode === 'split' && e.billItems.some(item => item.involved.includes(selectedMember.id))));
    
    if (isUsed) {
      Swal.fire({
        title: 'ไม่สามารถลบได้',
        text: `ไม่สามารถลบ "${selectedMember.name}" ได้ เนื่องจากมีชื่อเกี่ยวข้องกับบิลค่าใช้จ่าย`,
        icon: 'error',
        confirmButtonColor: '#111827',
        customClass: { popup: 'rounded-[2rem]' }
      });
      return;
    }

    Swal.fire({
      title: 'ยืนยันการลบสมาชิก?',
      text: `คุณต้องการลบ "${selectedMember.name}" ออกจากกลุ่มใช่หรือไม่?`,
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#111827',
      cancelButtonColor: '#ef4444',
      confirmButtonText: 'ใช่, ลบเลย!',
      cancelButtonText: 'ยกเลิก',
      customClass: {
        popup: 'rounded-[2rem] font-sans',
        confirmButton: 'rounded-xl px-6 py-3 font-bold',
        cancelButton: 'rounded-xl px-6 py-3 font-bold'
      }
    }).then((result) => {
      if (result.isConfirmed) {
        updateActiveTrip({ members: activeTrip.members.filter(m => m.id !== selectedMember.id) });
        setActiveModal(null);
        Swal.fire({
          title: 'ลบเรียบร้อย!',
          icon: 'success',
          timer: 1500,
          showConfirmButton: false,
          customClass: { popup: 'rounded-[2rem]' }
        });
      }
    });
  };

  const handleDeleteTrip = async (e, tripId) => {
    e.stopPropagation(); // Prevent selecting the trip when clicking delete
    
    const tripName = tripsData.trips[tripId]?.info?.name || 'ทริปนี้';

    Swal.fire({
      title: `ลบ ${tripName}?`,
      text: "ข้อมูลทั้งหมดในทริปนี้จะถูกลบถาวรและไม่สามารถเรียกคืนได้",
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#ef4444',
      cancelButtonColor: '#111827',
      confirmButtonText: 'ใช่, ลบเลย!',
      cancelButtonText: 'ยกเลิก',
      customClass: {
        popup: 'rounded-[2rem] font-sans',
        confirmButton: 'rounded-xl px-6 py-3 font-bold',
        cancelButton: 'rounded-xl px-6 py-3 font-bold'
      }
    }).then(async (result) => {
      if (result.isConfirmed) {
        // Delete from Cloud DB
        if (db) {
          const { error } = await db.from('trips').delete().eq('id', tripId);
          if (error) {
            console.error("Delete Trip Error:", error);
            Swal.fire('Error', 'ไม่สามารถลบทริปได้', 'error');
            return;
          }
        }

        // Update local state
        setTripsData(prev => {
          const newTrips = { ...prev.trips };
          delete newTrips[tripId];
          
          let newActiveId = prev.activeTripId;
          if (newActiveId === tripId) {
            newActiveId = Object.keys(newTrips)[0] || null;
            if (newActiveId) localStorage.setItem('whopay_active_trip_id', newActiveId);
            else localStorage.removeItem('whopay_active_trip_id');
          }
          
          return { activeTripId: newActiveId, trips: newTrips };
        });

        Swal.fire({
          title: 'ลบทริปแล้ว!',
          icon: 'success',
          timer: 1500,
          showConfirmButton: false,
          customClass: { popup: 'rounded-[2rem]' }
        });
      }
    });
  };

  const handleUploadSettlementSlip = async (e, debt) => {
    const file = e.target.files[0];
    if (!file) return;

    // Strict image-only validation
    if (!file.type.startsWith('image/')) {
      Swal.fire({
        title: 'ผิดพลาด',
        text: 'กรุณาอัปโหลดเฉพาะไฟล์รูปภาพ (สลิป) เท่านั้น',
        icon: 'error',
        customClass: { popup: 'rounded-[2rem]' }
      });
      return;
    }

    try {
      setIsLoadingDB(true);
      const slipBase64 = await resizeImage(file);
      
      const newExp = {
        id: 'settlement_' + Date.now(),
        title: `ชำระเงินให้ ${debt.toName}`,
        category: 'settlement',
        amount: debt.amount,
        paidBy: selectedMember.id,
        date: new Date().toISOString().split('T')[0],
        mode: 'quick',
        involved: [debt.toId],
        note: 'บันทึกการชำระเงินอัตโนมัติจากสลิป',
        image: slipBase64,
        isSettlement: true
      };

      const newExpenses = [newExp, ...expenses];
      await updateActiveTrip({ expenses: newExpenses });
      
      Swal.fire({
        title: 'ยืนยันสำเร็จ!',
        text: 'บันทึกการชำระเงินและสลิปเรียบร้อยแล้ว ยอดจะถูกหักลบอัตโนมัติ',
        icon: 'success',
        customClass: { popup: 'rounded-[2rem]' }
      });
      
      setExpandedDebtId(null);
      setActiveModal(null);
    } catch (err) {
      console.error(err);
      Swal.fire('Error', 'ไม่สามารถบันทึกสลิปได้', 'error');
    } finally {
      setIsLoadingDB(false);
    }
  };

  const handleCreateNewTrip = async (e) => {
    e.preventDefault();
    if (!newTripName.trim()) return;
    const newId = 'trip_' + Date.now();
    const newTrip = {
      id: newId,
      info: { name: newTripName, description: 'Created on ' + new Date().toLocaleDateString() },
      members: [],
      expenses: [],
      createdAt: new Date().toISOString()
    };
    
    if (db) {
      const appId = typeof window.__app_id !== 'undefined' ? window.__app_id : 'default-app-id';
      const { error } = await db.from('trips').upsert({
        id: newId,
        app_id: appId,
        info: newTrip.info,
        members: newTrip.members,
        expenses: newTrip.expenses
      });
      if (error) console.error("Create Trip Error:", error);
    }
    localStorage.setItem('whopay_active_trip_id', newId);
    setTripsData(prev => ({
      ...prev, activeTripId: newId, trips: { ...prev.trips, [newId]: newTrip }
    }));
    setNewTripName(''); setIsSidebarOpen(false);
  };

  // Bill Items Operations
  const addBillItem = () => setExpBillItems([...expBillItems, { id: Date.now().toString(), name: '', price: '', involved: members.map(m => m.id) }]);
  const updateBillItem = (id, field, value) => setExpBillItems(expBillItems.map(item => item.id === id ? { ...item, [field]: value } : item));
  const removeBillItem = (id) => setExpBillItems(expBillItems.filter(item => item.id !== id));
  const toggleBillItemInvolved = (itemId, memberId) => {
    setExpBillItems(expBillItems.map(item => {
      if (item.id !== itemId) return item;
      const isSelected = item.involved.includes(memberId);
      return { ...item, involved: isSelected ? item.involved.filter(i => i !== memberId) : [...item.involved, memberId] };
    }));
  };

  // Formatters
  const formatMoney = (num) => new Intl.NumberFormat('th-TH', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(num);
  const formatDateDisplay = (dateStr) => new Date(dateStr).toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
  const getInvolvedNames = (ids) => {
    if (ids.length === members.length) return 'ทุกคน';
    return ids.map(id => members.find(m => m.id === id)?.name).filter(Boolean).join(', ');
  };
  const getCategoryIcon = (catId) => { 
    const cat = CATEGORIES.find(c => c.id === catId); 
    const Icon = cat ? cat.icon : Receipt; 
    return <Icon className="w-5 h-5 text-gray-700" />; 
  };

  const [expandedDates, setExpandedDates] = useState({});
  const toggleDateGroup = (date) => setExpandedDates(prev => ({ ...prev, [date]: !prev[date] }));

  const groupedExpenses = useMemo(() => {
    const groups = {};
    expenses.filter(exp => exp.category !== 'settlement').forEach(exp => {
      const [year, month, day] = exp.date.split('-');
      const formattedDate = `${day}/${month}/${year}`;
      if (!groups[formattedDate]) groups[formattedDate] = { originalDate: exp.date, items: [] };
      groups[formattedDate].items.push(exp);
    });
    return Object.entries(groups).sort((a, b) => new Date(b[1].originalDate) - new Date(a[1].originalDate)).map(([date, data]) => ({ date, items: data.items }));
  }, [expenses]);

  if (isLoadingDB) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50">
      <RefreshCw className="w-8 h-8 text-gray-900 animate-spin mb-4" />
      <p className="font-bold text-gray-600">กำลังเชื่อมต่อฐานข้อมูล...</p>
    </div>
  );

  // Error page if cloud is enabled but connection failed
  if (db && !isCloudConnected) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-red-50 p-6 text-center">
      <div className="bg-white p-8 rounded-[2.5rem] shadow-xl max-w-sm w-full border border-red-100">
        <CloudOff className="w-16 h-16 text-red-500 mx-auto mb-6" />
        <h2 className="text-2xl font-bold text-gray-900 mb-2">การเชื่อมต่อล้มเหลว</h2>
        <p className="text-gray-500 mb-8 text-sm leading-relaxed">
          ไม่สามารถเชื่อมต่อกับ Supabase ได้ <br/>
          โปรดตรวจสอบการตั้งค่าฐานข้อมูลหรือตารางของคุณ
        </p>
        <button 
          onClick={() => window.location.reload()} 
          className="w-full bg-gray-900 text-white font-bold py-4 rounded-2xl hover:bg-gray-800 transition shadow-lg shadow-gray-900/10 flex items-center justify-center gap-2"
        >
          <RefreshCw className="w-4 h-4" /> ลองใหม่อีกครั้ง
        </button>
      </div>
    </div>
  );

  if (!activeTrip) return (
    <div className="min-h-screen flex flex-col items-center justify-center bg-gray-50 p-6">
      <div className="bg-white p-10 rounded-[3rem] shadow-xl max-w-md w-full text-center border border-gray-100">
        <div className="w-20 h-20 bg-gray-50 rounded-full flex items-center justify-center mx-auto mb-6">
          <Plus className="w-10 h-10 text-gray-300" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 mb-2">เริ่มต้นทริปแรกของคุณ</h2>
        <p className="text-gray-500 mb-8 text-sm leading-relaxed">
          ยังไม่มีข้อมูลทริปในขณะนี้ <br/>
          สร้างทริปใหม่เพื่อเริ่มบันทึกค่าใช้จ่ายกับเพื่อนๆ
        </p>
        <form onSubmit={handleCreateNewTrip} className="space-y-4">
          <input 
            type="text" 
            placeholder="ชื่อทริปของคุณ..." 
            value={newTripName} 
            onChange={(e) => setNewTripName(e.target.value)} 
            className="w-full px-6 py-4 bg-gray-50 border border-gray-100 rounded-2xl focus:outline-none focus:border-gray-900 transition text-center font-medium"
          />
          <button 
            type="submit" 
            disabled={!newTripName.trim()} 
            className="w-full bg-gray-900 text-white font-bold py-4 rounded-2xl hover:bg-gray-800 transition disabled:bg-gray-200 disabled:text-gray-400 shadow-lg shadow-gray-900/10"
          >
            สร้างทริป
          </button>
        </form>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 font-sans relative pb-32 selection:bg-gray-200">
      
      {/* ----------------- SIDEBAR ----------------- */}
      {isSidebarOpen && (
        <>
          <div className="fixed inset-0 bg-gray-900/40 z-40" onClick={() => setIsSidebarOpen(false)} />
          <div className="fixed inset-y-0 left-0 w-72 bg-white z-50 shadow-2xl flex flex-col animate-in slide-in-from-left duration-300">
            <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
              <h2 className="font-bold text-lg flex items-center gap-2"><Receipt className="w-5 h-5"/> My Trips</h2>
              <button onClick={() => setIsSidebarOpen(false)} className="p-2 hover:bg-gray-200 rounded-full"><X className="w-4 h-4"/></button>
            </div>
            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {Object.values(tripsData.trips)
                .sort((a, b) => {
                  const dateA = a.createdAt || (a.id.startsWith('trip_') ? parseInt(a.id.split('_')[1]) : 0);
                  const dateB = b.createdAt || (b.id.startsWith('trip_') ? parseInt(b.id.split('_')[1]) : 0);
                  return new Date(dateB) - new Date(dateA);
                })
                .map(trip => (
                  <div key={trip.id} className="relative group">
                  <button 
                    onClick={() => { 
                      setTripsData(prev => ({...prev, activeTripId: trip.id})); 
                      localStorage.setItem('whopay_active_trip_id', trip.id);
                      setIsSidebarOpen(false); 
                    }}
                    className={`w-full text-left p-4 pr-12 rounded-2xl transition-colors border ${tripsData.activeTripId === trip.id ? 'border-gray-900 bg-gray-900 text-white shadow-md' : 'border-gray-100 bg-white hover:border-gray-300'}`}
                  >
                    <p className="font-bold truncate">{trip.info.name}</p>
                    <p className={`text-xs mt-1 ${tripsData.activeTripId === trip.id ? 'text-gray-300' : 'text-gray-500'}`}>{trip.members.length} members</p>
                  </button>
                  <button 
                    onClick={(e) => handleDeleteTrip(e, trip.id)}
                    className={`absolute right-3 top-1/2 -translate-y-1/2 p-2 rounded-full transition-colors ${tripsData.activeTripId === trip.id ? 'text-gray-400 hover:text-white hover:bg-white/10' : 'text-gray-300 hover:text-red-500 hover:bg-red-50'}`}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              ))}
            </div>
            <div className="p-4 border-t border-gray-100 bg-white">
              <form onSubmit={handleCreateNewTrip} className="space-y-3">
                <p className="text-xs font-bold text-gray-400 uppercase tracking-wider pl-1">Create New Trip</p>
                <input type="text" placeholder="Trip Name..." value={newTripName} onChange={(e)=>setNewTripName(e.target.value)} className="w-full px-4 py-3 bg-gray-50 border border-gray-200 rounded-xl focus:outline-none focus:border-gray-900 text-sm" />
                <button type="submit" disabled={!newTripName.trim()} className="w-full bg-black text-white font-bold py-3 rounded-xl disabled:opacity-50">Add Trip</button>
              </form>
            </div>
          </div>
        </>
      )}

      {/* ----------------- TOP NAV ----------------- */}
      <div className="bg-white px-6 py-4 flex items-center justify-between sticky top-0 z-30 shadow-sm border-b border-gray-100">
        <button onClick={() => setIsSidebarOpen(true)} className="p-2 -ml-2 hover:bg-gray-100 rounded-full">
          <Menu className="w-6 h-6" />
        </button>
        <div className="flex items-center gap-2">
          {/* Status hidden when connected as per user request */}
        </div>
      </div>

      <div className="bg-white px-6 pt-6 pb-0 border-b border-gray-100">
        <div className="max-w-4xl mx-auto flex items-start justify-between">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold tracking-tight text-gray-900 flex items-center gap-3">
              {groupInfo.name}
              <button onClick={() => setActiveModal('editGroup')} className="text-gray-400 hover:text-gray-700 transition">
                <Pencil className="w-5 h-5" />
              </button>
            </h1>
            <p className="text-gray-500 mt-2 text-sm">{groupInfo.description}</p>
            <p className="text-gray-400 text-sm font-medium mt-4">
              ยอดทั้งกลุ่ม <span className="font-semibold text-gray-700 text-base">{formatMoney(totalExpense)}</span>
            </p>
          </div>
        </div>
        <div className="max-w-4xl mx-auto mt-6 flex gap-6">
          <button onClick={() => setActiveMainTab('dashboard')} className={`pb-3 text-sm font-bold transition-all border-b-2 ${activeMainTab === 'dashboard' ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>สรุปยอดเพื่อน ({members.length})</button>
          <button onClick={() => setActiveMainTab('expenses')} className={`pb-3 text-sm font-bold transition-all border-b-2 ${activeMainTab === 'expenses' ? 'border-gray-900 text-gray-900' : 'border-transparent text-gray-400 hover:text-gray-600'}`}>บิลทั้งหมด ({expenses.length})</button>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-6 mt-6">
        {/* DASHBOARD TAB */}
        {activeMainTab === 'dashboard' && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {balances.map((member) => (
              <div key={member.id} onClick={() => { setSelectedMember(member); setExpandedDebtId(null); setIsEditingMember(false); setActiveModal('memberDetail'); }} className={`border border-gray-200 bg-white rounded-3xl p-6 flex flex-col items-center justify-center cursor-pointer hover:shadow-lg transition-all duration-300 relative group`}>
                <div className={`w-20 h-20 mb-4 rounded-full flex items-center justify-center border overflow-hidden bg-gray-50 border-gray-100`}>
                  <img src={`https://api.dicebear.com/7.x/notionists/svg?seed=${member.avatarSeed}&backgroundColor=transparent`} alt={member.name} className="w-full h-full object-cover" />
                </div>
                <p className="font-bold text-gray-900 text-sm flex items-center gap-1">{member.name}</p>
                <p className={`font-bold mt-1 text-base ${Math.abs(member.balance) > 0.01 ? (member.balance > 0 ? 'text-green-600' : 'text-red-500') : 'text-gray-800'}`}>
                  {Math.abs(member.balance) > 0.01 ? (member.balance > 0 ? '+' : '-') : ''}{formatMoney(Math.abs(member.balance))}
                </p>
              </div>
            ))}
          </div>
        )}

        {/* EXPENSES TAB */}
        {activeMainTab === 'expenses' && (
          <div className="space-y-6 animate-in fade-in slide-in-from-bottom-2 duration-300">
            {groupedExpenses.length === 0 ? (
              <div className="text-center py-20">
                <Receipt className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500 font-medium">ยังไม่มีรายการค่าใช้จ่าย</p>
              </div>
            ) : (
              groupedExpenses.map((group, idx) => {
                const isExpanded = expandedDates[group.date] !== false;
                return (
                  <div key={idx} className="bg-white border border-gray-200 rounded-3xl overflow-hidden shadow-sm">
                    <div onClick={() => toggleDateGroup(group.date)} className="bg-gray-50/80 px-5 py-3 border-b border-gray-100 flex justify-between items-center text-sm cursor-pointer hover:bg-gray-100 transition">
                      <span className="font-semibold text-gray-700">{group.date}</span>
                      <span className="text-gray-400 font-medium flex items-center gap-1">{group.items.length} รายการ {isExpanded ? <ChevronUp className="w-4 h-4"/> : <ChevronDown className="w-4 h-4"/>}</span>
                    </div>
                    {isExpanded && (
                      <div className="divide-y divide-gray-100 animate-in fade-in">
                        {group.items.map(exp => (
                            <div key={exp.id} onClick={() => openBillDetail(exp)} className="p-5 hover:bg-gray-50/50 transition-colors cursor-pointer relative">
                              <div className="flex items-center justify-between mb-3">
                                <div className="flex items-center gap-4">
                                  <div className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 bg-gray-100 border border-transparent`}>
                                    {getCategoryIcon(exp.category)}
                                  </div>
                                  <div>
                                    <p className="font-bold text-gray-900 flex items-center gap-2">
                                      {exp.title}
                                      {exp.image && <ImageIcon className="w-3.5 h-3.5 text-gray-400" />}
                                    </p>
                                    <p className="text-xs text-gray-500 mt-1 line-clamp-1">
                                      จ่ายโดย: {members.find(m => m.id === exp.paidBy)?.name}
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right shrink-0">
                                  <p className="font-bold text-gray-900 text-lg">{formatMoney(exp.amount)}</p>
                                </div>
                              </div>
                              <div className="flex justify-between items-center text-xs text-gray-500 pt-3 border-t border-gray-50">
                                <p className="line-clamp-1 max-w-[80%]">
                                  หาร: {exp.mode === 'split' ? 'แยกรายการ (Split)' : getInvolvedNames(exp.involved)}
                                </p>
                              </div>
                            </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>

      <div className="fixed bottom-8 right-8 flex items-center gap-4 z-40">
        {activeMainTab === 'dashboard' && (
          <button onClick={() => setActiveModal('addMember')} className="bg-white border border-gray-200 text-gray-700 rounded-full w-14 h-14 flex items-center justify-center hover:bg-gray-50 shadow-lg shadow-gray-200/50 transition-all">
            <User className="w-6 h-6" />
          </button>
        )}
        <button onClick={openAddExpenseModal} className="bg-gray-900 text-white rounded-full h-14 px-6 flex items-center gap-2 hover:bg-gray-800 shadow-xl shadow-gray-900/20 transition-transform hover:scale-105 active:scale-95 font-semibold text-sm">
          <Plus className="w-5 h-5" /> บันทึกบิล
        </button>
      </div>

      {/* -------------------------------------------------- */}
      {/* MODALS */}
      {/* -------------------------------------------------- */}
      {activeModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-gray-900/60 backdrop-blur-sm animate-in fade-in duration-200">
          
          {/* View Image */}
          {activeModal === 'viewImage' && (
            <div className="relative w-full max-w-lg">
              <button onClick={() => setActiveModal(null)} className="absolute -top-12 right-0 p-2 text-white hover:text-gray-300"><X className="w-8 h-8"/></button>
              <img src={viewingImage} alt="Receipt" className="w-full rounded-2xl shadow-2xl" />
            </div>
          )}

          {/* Bill Detail Modal */}
          {activeModal === 'billDetail' && selectedExpense && (
            <div className="bg-white rounded-[2rem] w-full max-w-[28rem] shadow-2xl p-6 relative animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-start mb-6 sticky top-0 bg-white pt-2">
                <h2 className="text-2xl font-bold text-gray-900 pr-8">{selectedExpense.title}</h2>
                <button onClick={() => setActiveModal(null)} className="text-gray-400 hover:text-gray-700 bg-gray-50 p-1.5 rounded-full"><X className="w-5 h-5"/></button>
              </div>
              
              <div className="space-y-4 mb-8">
                {selectedExpense.image && (
                   <div className="mb-6 w-full h-32 rounded-2xl overflow-hidden relative group cursor-pointer border border-gray-200" onClick={() => { setViewingImage(selectedExpense.image); setActiveModal('viewImage'); }}>
                     <img src={selectedExpense.image} className="w-full h-full object-cover" alt="receipt" />
                     <div className="absolute inset-0 bg-black/30 flex items-center justify-center opacity-0 group-hover:opacity-100 transition"><Camera className="w-6 h-6 text-white"/></div>
                   </div>
                )}
                <div className="flex justify-between text-sm"><span className="text-gray-400">Date</span><span className="font-medium text-gray-900">{formatDateDisplay(selectedExpense.date)}</span></div>
                <div className="flex justify-between text-sm"><span className="text-gray-400">Category</span><span className="font-medium text-gray-900 flex items-center gap-2">{getCategoryIcon(selectedExpense.category)}{CATEGORIES.find(c => c.id === selectedExpense.category)?.name}</span></div>
                <div className="flex justify-between text-sm"><span className="text-gray-400">Paid By</span><span className="font-medium text-gray-900">{members.find(m => m.id === selectedExpense.paidBy)?.name}</span></div>
                <div className="flex justify-between text-sm"><span className="text-gray-400">Amount</span><span className="font-bold text-gray-900">{formatMoney(selectedExpense.amount)}</span></div>
                
                {selectedExpense.mode === 'quick' && (
                  <>
                    <div className="flex justify-between text-sm"><span className="text-gray-400">Per person</span><span className="font-medium text-gray-900">{formatMoney(selectedExpense.amount / selectedExpense.involved.length)}</span></div>
                    <div className="flex justify-between text-sm items-start"><span className="text-gray-400 whitespace-nowrap mr-4">Split between</span><span className="font-medium text-gray-900 text-right">{getInvolvedNames(selectedExpense.involved)}</span></div>
                  </>
                )}
                {selectedExpense.mode === 'split' && (
                   <div className="flex justify-between text-sm items-start"><span className="text-gray-400 whitespace-nowrap mr-4">Details</span><span className="font-medium text-gray-900 text-right">{selectedExpense.billItems.length} รายการย่อย (Split Bill)</span></div>
                )}
                {selectedExpense.note && (
                   <div className="pt-4 border-t border-gray-50 mt-4"><p className="text-xs text-gray-400 mb-1">Note:</p><p className="text-sm font-medium">{selectedExpense.note}</p></div>
                )}
              </div>

              <div className="flex gap-3 pt-4 border-t border-gray-100">
                <button onClick={() => handleDeleteExpense(selectedExpense.id)} className="w-12 h-12 shrink-0 flex items-center justify-center rounded-full border border-red-200 text-red-500 hover:bg-red-50 transition"><Trash2 className="w-5 h-5" /></button>
                <button onClick={() => openEditExpenseModal(selectedExpense)} className="flex-1 flex items-center justify-center gap-2 rounded-full border border-gray-200 text-gray-900 font-bold hover:bg-gray-50 transition"><Pencil className="w-4 h-4" /> edit</button>
              </div>
            </div>
          )}

          {/* Modal: Add/Edit Expense */}
          {activeModal === 'addExpense' && (
            <div className="bg-white rounded-[2rem] w-full max-w-[28rem] shadow-2xl flex flex-col max-h-[90vh] overflow-hidden animate-in zoom-in-95 duration-200">
              <div className="p-6 pb-2 shrink-0 relative">
                <h2 className="text-xl font-bold text-center">{editingExpenseId ? 'Edit Expense' : 'Add Expenses'}</h2>
                <button onClick={() => setActiveModal(null)} className="absolute right-6 top-6 text-gray-400 hover:text-gray-600 bg-gray-50 p-2 rounded-full"><X className="w-5 h-5"/></button>
                
                <div className="flex bg-gray-50 border border-gray-100 rounded-full p-1 mt-6">
                  <button type="button" onClick={() => setExpMode('quick')} className={`flex-1 py-2.5 rounded-full text-sm font-bold transition-colors ${expMode === 'quick' ? 'bg-black text-white shadow-md' : 'text-gray-500 hover:text-gray-700'}`}>quick add</button>
                  <button type="button" onClick={() => {
                    setExpMode('split');
                    if (expBillItems.length === 0) setExpBillItems([{ id: Date.now().toString(), name: '', price: '', involved: members.map(m => m.id) }]);
                  }} className={`flex-1 py-2.5 rounded-full text-sm font-bold transition-colors ${expMode === 'split' ? 'bg-black text-white shadow-md' : 'text-gray-500 hover:text-gray-700'}`}>split bill</button>
                </div>
              </div>

              <div className="p-6 overflow-y-auto space-y-4 custom-scrollbar">
                <FloatingInput label="Date" type="date" value={expDate} onChange={(e)=>setExpDate(e.target.value)} icon={Calendar} />
                <FloatingInput label="Title" required value={expTitle} onChange={(e)=>setExpTitle(e.target.value)} placeholder="เช่น ค่าที่พัก, ค่าอาหาร" />
                
                <CustomDropdown 
                  label="Category" value={expCategory} onChange={setExpCategory}
                  options={CATEGORIES.map(c => ({ value: c.id, label: c.name, icon: c.icon }))}
                />

                <div className="flex gap-4">
                  <div className="flex-1">
                    <FloatingInput 
                      label={expMode === 'split' ? "Total Amount (Auto)" : "Amount"} 
                      type="number" required 
                      value={expAmount} onChange={(e)=>setExpAmount(e.target.value)} placeholder="0" 
                      disabled={expMode === 'split'}
                    />
                  </div>
                  <div className="flex-1">
                    <CustomDropdown 
                      label="Paid By" value={expPayer} onChange={setExpPayer}
                      options={members.map(m => ({ value: m.id, label: m.name }))}
                    />
                  </div>
                </div>

                {expMode === 'quick' && (
                  <div className="relative" ref={shareDropdownRef}>
                    <div onClick={() => setIsShareDropdownOpen(!isShareDropdownOpen)} className="relative border border-gray-200 rounded-2xl px-4 py-3 bg-white cursor-pointer flex items-center min-h-[50px] focus-within:border-gray-900">
                      <label className="absolute -top-2.5 left-4 bg-white px-1 text-xs text-gray-400 font-medium z-10">Share with</label>
                      <p className="w-full text-sm font-medium text-gray-900 truncate pr-6">{getInvolvedNames(expInvolved)}</p>
                      <ChevronDown className="absolute right-4 w-4 h-4 text-gray-400 pointer-events-none" />
                    </div>
                    {isShareDropdownOpen && (
                      <div className="absolute top-full left-0 right-0 mt-2 bg-white border border-gray-100 shadow-xl rounded-2xl z-20 py-2 max-h-48 overflow-y-auto">
                        <div className="flex justify-end px-4 py-2 border-b border-gray-100 gap-2">
                           <button type="button" onClick={() => setExpInvolved(members.map(m=>m.id))} className="text-xs text-indigo-600 font-medium">เลือกทุกคน</button>
                           <button type="button" onClick={() => setExpInvolved([])} className="text-xs text-gray-400 font-medium">ล้าง</button>
                        </div>
                        {members.map(m => (
                          <div key={m.id} onClick={() => toggleExpInvolved(m.id)} className="flex items-center px-4 py-2.5 hover:bg-gray-50 cursor-pointer">
                            <div className={`w-5 h-5 rounded flex items-center justify-center mr-3 border ${expInvolved.includes(m.id) ? 'bg-black border-black text-white' : 'border-gray-300 bg-white'}`}>
                              {expInvolved.includes(m.id) && <Check className="w-3.5 h-3.5" />}
                            </div>
                            <span className="text-sm font-medium">{m.name}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}

                {expMode === 'split' && (
                  <div className="pt-2 pb-4 space-y-4 border-t border-gray-100 mt-6 animate-in slide-in-from-top-2">
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2">Fees & Taxes</p>
                    
                    {[ { label: 'Discount (฿)', state: expDiscountFull, setter: setExpDiscountFull, use: useDiscountFull, setUse: setUseDiscountFull },
                       { label: 'Discount (%)', state: expDiscountPct, setter: setExpDiscountPct, use: useDiscountPct, setUse: setUseDiscountPct },
                       { label: 'Service charge (%)', state: expServiceCharge, setter: setExpServiceCharge, use: useSc, setUse: setUseSc },
                       { label: 'VAT (%)', state: expVat, setter: setExpVat, use: useVat, setUse: setUseVat },
                    ].map((fee, idx) => (
                      <div key={idx} className="flex items-center gap-3">
                        <div onClick={() => fee.setUse(!fee.use)} className={`w-6 h-6 rounded flex items-center justify-center border shrink-0 cursor-pointer transition-colors ${fee.use ? 'bg-black border-black text-white' : 'border-gray-300 bg-white hover:border-gray-400'}`}>
                          {fee.use && <Check className="w-4 h-4" />}
                        </div>
                        <div className="flex-1"><FloatingInput label={fee.label} type="number" value={fee.state} onChange={(e)=>fee.setter(e.target.value)} disabled={!fee.use} /></div>
                      </div>
                    ))}

                    <div className="flex justify-between items-center mt-6 mb-2">
                      <h4 className="font-bold text-gray-900">รายการในบิล ({expBillItems.length})</h4>
                      <button type="button" onClick={addBillItem} className="bg-gray-900 text-white rounded-full px-4 py-2 text-xs font-bold hover:bg-gray-800 flex items-center gap-1 shadow-sm"><Plus className="w-3.5 h-3.5"/> เพิ่มรายการ</button>
                    </div>

                    {expBillItems.length === 0 && <p className="text-center text-sm text-gray-400 py-6 border border-dashed border-gray-300 rounded-2xl bg-gray-50">ยังไม่มีรายการ กดเพิ่มรายการด้านบน</p>}

                    <div className="space-y-4">
                      {expBillItems.map((item, idx) => (
                        <div key={item.id} className="border border-gray-200 p-4 rounded-2xl relative bg-white shadow-sm">
                          <button type="button" onClick={() => removeBillItem(item.id)} className="absolute -top-3 -right-2 bg-red-50 border border-red-100 text-red-500 p-1.5 rounded-full hover:bg-red-100 shadow-sm transition"><Trash2 className="w-3.5 h-3.5" /></button>
                          <div className="flex gap-3 mb-4 mt-2">
                            <div className="flex-[2]"><input type="text" placeholder={`ชื่อรายการที่ ${idx+1}`} value={item.name} onChange={(e)=>updateBillItem(item.id, 'name', e.target.value)} className="w-full text-sm font-medium p-2.5 rounded-xl border border-gray-200 outline-none focus:border-gray-900 bg-gray-50" /></div>
                            <div className="flex-[1]"><input type="number" placeholder="ราคา" value={item.price} onChange={(e)=>updateBillItem(item.id, 'price', e.target.value)} className="w-full text-sm font-bold p-2.5 rounded-xl border border-gray-200 outline-none focus:border-gray-900 bg-gray-50" /></div>
                          </div>
                          <p className="text-xs text-gray-400 mb-2 font-medium">ใครร่วมหารจานนี้บ้าง?</p>
                          <div className="flex flex-wrap gap-2">
                            {members.map(m => (
                              <button type="button" key={m.id} onClick={() => toggleBillItemInvolved(item.id, m.id)} className={`text-xs px-3 py-1.5 rounded-full font-bold transition-all border ${item.involved.includes(m.id) ? 'bg-gray-900 border-gray-900 text-white shadow-sm' : 'bg-white border-gray-200 text-gray-500 hover:bg-gray-50'}`}>
                                {m.name}
                              </button>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                    {(() => {
                       const enteredTotal = Number(expAmount) || 0;
                       const { total: expectedGrandTotal } = calculateSplitBillData(expBillItems, expDiscountFull, expDiscountPct, expServiceCharge, expVat, useDiscountFull, useDiscountPct, useSc, useVat);
                       const difference = enteredTotal - expectedGrandTotal;
                       const isMismatch = Math.abs(difference) > 0.01 && (enteredTotal > 0 || expBillItems.length > 0);
                       return isMismatch && (
                         <div className="bg-red-50 text-red-600 p-4 rounded-2xl border border-red-100 mt-4 animate-in fade-in">
                           <p className="font-bold text-sm">ยอดรวมรายการไม่ตรง {difference > 0 ? 'ขาดอีก' : 'เกินมา'} {formatMoney(Math.abs(difference))} ({formatMoney(expectedGrandTotal)} / {formatMoney(enteredTotal)})</p>
                         </div>
                       );
                    })()}
                  </div>
                )}

                <FloatingInput label="Note (Optional)" value={expNote} onChange={(e)=>setExpNote(e.target.value)} placeholder="รายละเอียดเพิ่มเติม" />
                
                {/* Upload Image Section */}
                <div className="mt-4">
                  <input type="file" accept="image/*" id="bill-image" className="hidden" onChange={handleImageUpload} />
                  {expImage ? (
                    <div className="relative border border-gray-200 rounded-2xl overflow-hidden group">
                      <img src={expImage} alt="Uploaded Bill" className="w-full h-32 object-cover" />
                      <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <button type="button" onClick={() => setExpImage(null)} className="bg-red-500 text-white p-2 rounded-full hover:bg-red-600"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                  ) : (
                    <label htmlFor="bill-image" className="w-full py-4 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center text-gray-400 hover:text-gray-600 hover:border-gray-400 transition-colors bg-gray-50 hover:bg-gray-100 cursor-pointer">
                      <Camera className="w-6 h-6 mb-2" />
                      <span className="text-sm font-medium">แนบรูปใบเสร็จ (ถ้ามี)</span>
                    </label>
                  )}
                </div>

              </div>

              <div className="p-6 pt-4 border-t border-gray-100 flex gap-4 shrink-0 bg-white">
                <button type="button" onClick={() => setActiveModal(null)} className="flex-1 py-3.5 rounded-full border border-gray-200 font-bold text-sm text-gray-700 hover:bg-gray-50 transition">cancel</button>
                <button onClick={handleAddExpense} disabled={isSaveDisabled} className="flex-1 py-3.5 rounded-full bg-gray-900 text-white font-bold text-sm hover:bg-gray-800 transition disabled:bg-gray-200 disabled:text-gray-400">save</button>
              </div>
            </div>
          )}

          {/* Add Member */}
          {activeModal === 'addMember' && (
            <div className="bg-white rounded-[2rem] p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95">
              <div className="flex justify-between items-center mb-6"><h3 className="text-xl font-bold">เพิ่มสมาชิกใหม่</h3><button onClick={() => setActiveModal(null)} className="p-2 bg-gray-50 rounded-full"><X className="w-5 h-5"/></button></div>
              <form onSubmit={handleAddMember} className="space-y-4">
                <FloatingInput label="ชื่อเพื่อน" value={newMemberName} onChange={(e) => setNewMemberName(e.target.value)} autoFocus required />
                <FloatingInput label="เบอร์โทร / เลขบัตร (PromptPay)" value={newMemberPromptPay} onChange={(e) => setNewMemberPromptPay(e.target.value)} placeholder="08x-xxx-xxxx" />
                <button type="submit" className="w-full bg-gray-900 text-white font-bold py-3.5 rounded-full shadow-lg">เพิ่มสมาชิก</button>
              </form>
            </div>
          )}

          {/* Edit Group Info */}
          {activeModal === 'editGroup' && (
            <div className="bg-white rounded-[2rem] p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95">
              <div className="flex justify-between items-center mb-6"><h3 className="text-xl font-bold">แก้ไขทริปนี้</h3><button onClick={() => setActiveModal(null)} className="p-2 bg-gray-50 rounded-full"><X className="w-5 h-5"/></button></div>
              <div className="space-y-4">
                <FloatingInput label="ชื่อกลุ่ม" value={groupInfo.name} onChange={(e) => updateActiveTrip({ info: { ...groupInfo, name: e.target.value }})} />
                <FloatingInput label="คำอธิบาย" value={groupInfo.description} onChange={(e) => updateActiveTrip({ info: { ...groupInfo, description: e.target.value }})} />
                <button onClick={() => setActiveModal(null)} className="w-full bg-gray-900 text-white font-bold py-3.5 rounded-full shadow-lg mt-2">เสร็จสิ้น</button>
              </div>
            </div>
          )}

          {/* Member Detail */}
          {activeModal === 'memberDetail' && selectedMember && (
            <div className="bg-white rounded-[2rem] p-6 w-full max-w-sm shadow-2xl animate-in zoom-in-95 relative">
              <div className="absolute top-6 right-6 flex gap-2">
                <button onClick={() => { setIsEditingMember(true); setEditMemberName(selectedMember.name); setEditMemberPromptPay(selectedMember.promptpay || ''); }} className="p-2 hover:bg-gray-100 rounded-full text-gray-500"><Pencil className="w-4 h-4"/></button>
                <button onClick={handleDeleteMember} className="p-2 hover:bg-red-50 rounded-full text-red-400"><Trash2 className="w-4 h-4"/></button>
                <button onClick={() => setActiveModal(null)} className="p-2 hover:bg-gray-100 rounded-full bg-gray-50 ml-2"><X className="w-4 h-4"/></button>
              </div>

              {isEditingMember ? (
                <form onSubmit={(e) => { 
                  e.preventDefault(); 
                  if (!editMemberName.trim()) return; 
                  updateActiveTrip({ members: activeTrip.members.map(m => m.id === selectedMember.id ? { ...m, name: editMemberName, promptpay: editMemberPromptPay } : m) }); 
                  setSelectedMember({ ...selectedMember, name: editMemberName, promptpay: editMemberPromptPay }); 
                  setIsEditingMember(false); 
                }} className="mb-6 pt-10">
                  <div className="space-y-4">
                    <FloatingInput label="แก้ไขชื่อเพื่อน" value={editMemberName} onChange={(e) => setEditMemberName(e.target.value)} autoFocus required />
                    <FloatingInput label="แก้ไข PromptPay" value={editMemberPromptPay} onChange={(e) => setEditMemberPromptPay(e.target.value)} />
                    <div className="flex gap-2 mt-3">
                      <button type="button" onClick={() => setIsEditingMember(false)} className="flex-1 py-2 rounded-xl bg-gray-100 font-bold text-sm">ยกเลิก</button>
                      <button type="submit" className="flex-1 py-2 rounded-xl bg-gray-900 text-white font-bold text-sm">บันทึก</button>
                    </div>
                  </div>
                </form>
              ) : (
                <div className="flex items-center gap-4 mb-6 pt-4">
                  <div className="w-16 h-16 bg-gray-50 rounded-full border overflow-hidden shrink-0"><img src={`https://api.dicebear.com/7.x/notionists/svg?seed=${selectedMember.avatarSeed}`} alt="avatar" /></div>
                  <div>
                    <h3 className="text-xl font-bold">{selectedMember.name}</h3>
                    <p className={`text-sm font-bold mt-0.5 ${selectedMember.balance > 0 ? 'text-green-600' : selectedMember.balance < 0 ? 'text-red-500' : 'text-gray-500'}`}>
                      {selectedMember.balance > 0 ? 'รอรับเงินคืน' : selectedMember.balance < 0 ? 'ค้างชำระ' : 'เคลียร์ยอดครบแล้ว'} 
                      {Math.abs(selectedMember.balance) > 0.01 && ` (${formatMoney(Math.abs(selectedMember.balance))})`}
                    </p>
                    {selectedMember.promptpay && <p className="text-xs text-gray-400 mt-1">PromptPay: {selectedMember.promptpay}</p>}
                  </div>
                </div>
              )}
              
              <div className="space-y-4">
                {selectedMember.receiveFrom.length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 pl-1">จะได้รับเงินจาก</p>
                    <div className="space-y-2">{selectedMember.receiveFrom.map((credit, i) => <div key={`receive-${i}`} className="flex justify-between p-4 bg-gray-50 rounded-2xl"><span className="font-semibold text-gray-700">{credit.fromName}</span><span className="font-bold text-lg">{formatMoney(credit.amount)}</span></div>)}</div>
                  </div>
                )}

                {selectedMember.payTo.length > 0 && (
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 pl-1 mt-4">ต้องโอนให้</p>
                    <div className="space-y-2">
                      {selectedMember.payTo.map((debt, i) => {
                        const targetMember = members.find(m => m.id === debt.toId);
                        const pp = targetMember?.promptpay;
                        const isExpanded = expandedDebtId === `pay-${i}`;
                        return (
                          <div 
                            key={`pay-${i}`} 
                            onClick={() => pp && setExpandedDebtId(isExpanded ? null : `pay-${i}`)}
                            className={`flex flex-col gap-2 p-4 bg-gray-50 rounded-2xl border border-gray-100 transition-all ${pp ? 'cursor-pointer hover:bg-gray-100' : ''}`}
                          >
                            <div className="flex justify-between items-center">
                              <div className="flex items-center gap-2">
                                <span className="font-semibold text-gray-700">{debt.toName}</span>
                                {pp && <ChevronDown className={`w-3.5 h-3.5 text-gray-400 transition-transform ${isExpanded ? 'rotate-180' : ''}`} />}
                              </div>
                              <span className="font-bold text-lg">{formatMoney(debt.amount)}</span>
                            </div>
                            {pp && isExpanded && (
                              <div 
                                onClick={(e) => e.stopPropagation()}
                                className="mt-2 flex flex-col items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100 animate-in slide-in-from-top-2"
                              >
                                <p className="text-[10px] font-bold text-blue-600 uppercase tracking-[0.2em] mb-3">PromptPay QR</p>
                                <img 
                                  src={`https://promptpay.io/${pp}/${debt.amount.toFixed(2)}.png`} 
                                  alt="PromptPay QR" 
                                  className="w-40 h-40 object-contain"
                                />
                                <p className="text-[10px] text-gray-400 mt-2 font-medium">{pp}</p>
                                
                                <input 
                                  type="file" 
                                  accept="image/*" 
                                  id={`slip-upload-${i}`} 
                                  className="hidden" 
                                  onChange={(e) => handleUploadSettlementSlip(e, debt)} 
                                />
                                <label 
                                  htmlFor={`slip-upload-${i}`}
                                  className="mt-6 w-full py-3.5 bg-gray-900 text-white rounded-xl text-xs font-bold hover:bg-gray-800 transition flex items-center justify-center gap-2 shadow-lg shadow-gray-200 cursor-pointer"
                                >
                                  <Camera className="w-4 h-4" /> ส่งสลิปยืนยัน {formatMoney(debt.amount)}
                                </label>
                              </div>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Settlement History (Already Paid/Received) */}
                {(settlementHistory[selectedMember.id]?.length > 0) && (
                  <div>
                    <p className="text-xs font-bold text-gray-400 uppercase tracking-wider mb-2 pl-1 mt-4">ประวัติการชำระเงิน</p>
                    <div className="space-y-2">
                      {settlementHistory[selectedMember.id].map((h, i) => (
                        <div 
                          key={`hist-${i}`} 
                          onClick={() => h.image && (setViewingImage(h.image), setActiveModal('viewImage'))}
                          className={`flex justify-between items-center p-4 bg-white border border-gray-100 rounded-2xl ${h.image ? 'cursor-pointer hover:bg-gray-50' : ''}`}
                        >
                          <div className="flex items-center gap-3">
                            <div className={`p-2 rounded-full ${h.type === 'paid' ? 'bg-indigo-50 text-indigo-600' : 'bg-green-50 text-green-600'}`}>
                              <CheckCircle2 className="w-4 h-4" />
                            </div>
                            <div>
                              <p className="text-sm font-bold text-gray-800">
                                {h.type === 'paid' ? `โอนให้ ${h.partnerName}` : `ได้รับจาก ${h.partnerName}`}
                              </p>
                              <p className="text-[10px] text-gray-400 font-medium">{h.date} • {h.type === 'paid' ? 'Already Paid' : 'Received'}</p>
                            </div>
                          </div>
                          <div className="text-right flex items-center gap-2">
                            <span className="font-bold text-sm text-gray-900">{formatMoney(h.amount)}</span>
                            {h.image && <ImageIcon className="w-3.5 h-3.5 text-gray-400" />}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {Math.abs(selectedMember.balance) < 0.01 && settlementHistory[selectedMember.id]?.length === 0 && (
                  <div className="text-center py-8 bg-gray-50 rounded-3xl"><CheckCircle2 className="w-10 h-10 text-gray-300 mx-auto mb-3" /><p className="text-gray-500 font-bold text-sm">ไม่ต้องโอนหรือรับเงินจากใครแล้ว</p></div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}