import React, { useState, useEffect, useMemo } from "react";
import {
  Utensils,
  ShoppingCart,
  Users,
  TrendingUp,
  LogOut,
  ChevronRight,
  Plus,
  Minus,
  Trash2,
  Printer,
  ChefHat,
  LayoutDashboard,
  ClipboardList,
  User,
  Coins,
  Coffee,
  Beer,
  Pizza,
  IceCream,
  Search,
  CheckCircle2,
  Clock,
  History,
  FileText,
  CreditCard,
  Banknote,
  Smartphone,
  Eye,
  EyeOff,
  X,
} from "lucide-react";
import { motion, AnimatePresence } from "motion/react";
import { Toaster, toast } from "react-hot-toast";
import { jsPDF } from "jspdf";
import "jspdf-autotable";
import {
  User as UserType,
  Table,
  Category,
  Product,
  Order,
  OrderItem,
} from "./types";

// Mock API Call helpers
const API_URL = "/api";

export default function App() {
  const [token, setToken] = useState<string | null>(
    localStorage.getItem("token"),
  );
  const [user, setUser] = useState<UserType | null>(
    JSON.parse(localStorage.getItem("user") || "null"),
  );
  const [view, setView] = useState<
    "login" | "tables" | "order" | "admin" | "history" | "settings"
  >("login");

  const [data, setData] = useState<{
    tables: Table[];
    categories: Category[];
    products: Product[];
    orders: Order[];
    users: UserType[];
    paymentMethods: { id: string; name: string }[];
    cashRegister: {
      isOpen: boolean;
      openedAt: string | null;
      openedBy: string | null;
      initialValue: number;
      history: any[];
    };
    config: any;
  }>({
    tables: [],
    categories: [],
    products: [],
    orders: [],
    users: [],
    paymentMethods: [],
    cashRegister: {
      isOpen: false,
      openedAt: null,
      openedBy: null,
      initialValue: 0,
      history: [],
    },
    config: {},
  });
  const [adminUsers, setAdminUsers] = useState<UserType[]>([]);
  const [adminTab, setAdminTab] = useState("Painel");

  const [searchQuery, setSearchQuery] = useState("");
  const [historySearch, setHistorySearch] = useState("");

  const [loading, setLoading] = useState(false);
  const [selectedTable, setSelectedTable] = useState<Table | null>(null);
  const [selectedCategory, setSelectedCategory] = useState("all");
  const [cart, setCart] = useState<OrderItem[]>([]);
  const [observations, setObservations] = useState("");

  const [showOpenCashModal, setShowOpenCashModal] = useState(false);
  const [initialCashValue, setInitialCashValue] = useState("0");
  const [showPassword, setShowPassword] = useState(false);

  const [paymentOrder, setPaymentOrder] = useState<Order | null>(null);
  const [paymentCart, setPaymentCart] = useState<OrderItem[]>([]);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [historyDetailOrder, setHistoryDetailOrder] = useState<Order | null>(null);
  const [showHistoryDetailModal, setShowHistoryDetailModal] = useState(false);
  const [notificationsEnabled, setNotificationsEnabled] = useState(false);

  // Auto-redirect on load - Only run once on mount or when auth changes
  useEffect(() => {
    if (token && user && view === "login") {
      setView(user.role === "admin" ? "admin" : "tables");
    }
  }, [token, user]);

  // Data fetching and poller
  useEffect(() => {
    if (token) {
      fetchData();
      if (user?.role === "admin") fetchUsers();
    }

    // Request notification permission
    if ("Notification" in window && Notification.permission !== "granted") {
      Notification.requestPermission().then((permission) => {
        setNotificationsEnabled(permission === "granted");
      });
    } else if ("Notification" in window) {
      setNotificationsEnabled(Notification.permission === "granted");
    }

    // Background poller for new orders/status changes
    const interval = setInterval(() => {
      if (token) fetchData(true);
    }, 5000); // Check every 5s

    return () => clearInterval(interval);
  }, [token, user]);

  const fetchData = async (background = false) => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/data`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const d = await res.json();

        // Notify if new orders (status simulation)
        if (
          background &&
          d.orders.length > data.orders.length &&
          user?.role === "admin"
        ) {
          showNotification("Novo Pedido!", `Um novo pedido foi recebido.`);
        }

        setData(d);
      } else if (res.status === 401) {
        handleLogout();
      }
    } catch (err) {
      console.error(err);
    }
  };

  const showNotification = (title: string, body: string) => {
    if ("Notification" in window && Notification.permission === "granted") {
      new Notification(title, { body, icon: "/favicon.ico" });
    }
  };

  const fetchUsers = async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API_URL}/admin/users`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        setAdminUsers(await res.json());
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleLogin = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const username = formData.get("username") as string;
    const password = formData.get("password") as string;

    try {
      const res = await fetch(`${API_URL}/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
      const d = await res.json();
      if (res.ok) {
        setToken(d.token);
        setUser(d.user);
        localStorage.setItem("token", d.token);
        localStorage.setItem("user", JSON.stringify(d.user));
        setView(d.user.role === "admin" ? "admin" : "tables");
        toast.success(`Bem-vindo, ${d.user.name}!`);
        // Refresh data after login
        const dataRes = await fetch(`${API_URL}/data`, {
          headers: { Authorization: `Bearer ${d.token}` },
        });
        if (dataRes.ok) setData(await dataRes.json());
      } else {
        toast.error(d.message || "Erro ao fazer login");
      }
    } catch (err) {
      toast.error("Erro na conexão com o servidor");
    }
  };

  const handleLogout = () => {
    setToken(null);
    setUser(null);
    localStorage.removeItem("token");
    localStorage.removeItem("user");
    setView("login");
  };

  const addToCart = (product: Product) => {
    setCart((prev) => {
      const existing = prev.find((item) => item.productId === product.id);
      if (existing) {
        return prev.map((item) =>
          item.productId === product.id
            ? { ...item, quantity: item.quantity + 1 }
            : item,
        );
      }
      return [
        ...prev,
        {
          productId: product.id,
          name: product.name,
          price: product.price,
          quantity: 1,
        },
      ];
    });
    toast.success(`${product.name} adicionado!`, { duration: 1000 });
  };

  const removeFromCart = (productId: string) => {
    setCart((prev) => prev.filter((item) => item.productId !== productId));
  };

  const updateQuantity = (productId: string, delta: number) => {
    setCart((prev) => {
      const item = prev.find((i) => i.productId === productId);
      if (!item) return prev;
      
      const newQty = item.quantity + delta;
      if (newQty <= 0) {
        if (window.confirm(`Remover "${item.name}" do pedido?`)) {
          return prev.filter((i) => i.productId !== productId);
        }
        return prev;
      }
      
      return prev.map((i) =>
        i.productId === productId ? { ...i, quantity: newQty } : i,
      );
    });
  };

  const updateCartManual = (productId: string, value: string) => {
    if (value === "") {
      setCart(prev => prev.map(i => i.productId === productId ? { ...i, quantity: 0 } : i));
      return;
    }
    const qty = parseInt(value);
    if (isNaN(qty)) return;
    
    if (qty <= 0) {
      const item = cart.find(i => i.productId === productId);
      if (window.confirm(`Remover "${item?.name}" do pedido?`)) {
        removeFromCart(productId);
      }
      return;
    }

    setCart((prev) =>
      prev.map((item) =>
        item.productId === productId ? { ...item, quantity: qty } : item,
      ),
    );
  };

  const cartTotal = useMemo(() => {
    return cart.reduce((acc, item) => acc + item.price * item.quantity, 0);
  }, [cart]);

  const submitOrder = async () => {
    if (!selectedTable || cart.length === 0) return;
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/orders`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          tableId: selectedTable.id,
          items: cart,
          total: cartTotal,
          observations,
        }),
      });
      if (res.ok) {
        toast.success("Pedido enviado com sucesso!");
        setCart([]);
        setObservations("");
        setSelectedTable(null);
        setView("tables");
        fetchData();
        // Here we would trigger the print dialog
        setTimeout(() => window.print(), 500);
      } else {
        toast.error("Erro ao enviar pedido");
      }
    } catch (err) {
      toast.error("Erro na conexão");
    } finally {
      setLoading(false);
    }
  };

  const finishOrder = async (order: Order) => {
    setPaymentOrder(order);
    setPaymentCart([]);
    setPaymentDiscount(0);
    setPaymentTip(0);
    setSelectedPaymentMethod(null);
    setShowPaymentModal(true);
  };

  const [paymentDiscount, setPaymentDiscount] = useState<number>(0);
  const [paymentTip, setPaymentTip] = useState<number>(0);

  const updatePaymentCartQuantity = (index: number, delta: number) => {
    setPaymentCart((prev) => {
      const item = prev[index];
      const newQty = item.quantity + delta;
      
      if (newQty <= 0) {
        if (window.confirm(`Remover "${item.name}" dos adicionais?`)) {
          return prev.filter((_, i) => i !== index);
        }
        return prev;
      }

      const newCart = [...prev];
      newCart[index] = { ...newCart[index], quantity: newQty };
      return newCart;
    });
  };

  const updatePaymentCartManual = (index: number, value: string) => {
    if (value === "") {
      setPaymentCart(prev => {
        const newCart = [...prev];
        newCart[index] = { ...newCart[index], quantity: 0 };
        return newCart;
      });
      return;
    }
    const qty = parseInt(value);
    if (isNaN(qty)) return;

    if (qty <= 0) {
      const item = paymentCart[index];
      if (window.confirm(`Remover "${item.name}" dos adicionais?`)) {
        setPaymentCart(prev => prev.filter((_, i) => i !== index));
      }
      return;
    }

    setPaymentCart((prev) => {
      const newCart = [...prev];
      newCart[index] = { ...newCart[index], quantity: qty };
      return newCart;
    });
  };

  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<
    string | null
  >(null);

  const confirmFinishOrder = async (
    orderId: string,
    method: string,
    extraItems: OrderItem[],
    discount: number,
    tip: number,
  ) => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/orders/${orderId}/finish`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          paymentMethod: method,
          extraItems,
          discount,
          tip,
        }),
      });
      if (res.ok) {
        toast.success("Comanda finalizada e paga!");
        setShowPaymentModal(false);
        fetchData();
      }
    } catch (err) {
      toast.error("Erro ao finalizar");
    } finally {
      setLoading(false);
    }
  };

  const generatePDFReport = (historyItem: any) => {
    const doc = new jsPDF() as any;
    doc.setFontSize(20);
    doc.text("Relatório de Fechamento de Caixa", 10, 20);
    doc.setFontSize(12);
    doc.text(
      `Aberto em: ${new Date(historyItem.openedAt).toLocaleString()}`,
      10,
      30,
    );
    doc.text(
      `Fechado em: ${new Date(historyItem.closedAt).toLocaleString()}`,
      10,
      40,
    );
    doc.text(`Operador: ${historyItem.openedBy}`, 10, 50);
    doc.text(
      `Valor Inicial: R$ ${historyItem.initialValue.toFixed(2)}`,
      10,
      60,
    );
    doc.text(`Total Vendas: R$ ${historyItem.totalSales.toFixed(2)}`, 10, 70);
    doc.text(
      `Saldo Final: R$ ${(historyItem.initialValue + historyItem.totalSales).toFixed(2)}`,
      10,
      80,
    );

    doc.save(`relatorio-caixa-${new Date(historyItem.closedAt).getTime()}.pdf`);
  };

  const addTable = async (number: string) => {
    try {
      const res = await fetch(`${API_URL}/admin/tables`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ number }),
      });
      if (res.ok) {
        toast.success("Mesa adicionada!");
        fetchData();
      }
    } catch (err) {
      toast.error("Erro ao adicionar mesa");
    }
  };

  const removeTable = async (id: string) => {
    if (!confirm("Deseja remover esta mesa?")) return;
    try {
      const res = await fetch(`${API_URL}/admin/tables/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        toast.success("Mesa removida!");
        fetchData();
      }
    } catch (err) {
      toast.error("Erro ao remover mesa");
    }
  };

  const payOrder = async (orderId: string) => {
    const order = data.orders.find((o) => o.id === orderId);
    let method = order?.paymentMethod;

    if (!method) {
      method =
        prompt(
          "Forma de Pagamento:\n" +
            data.paymentMethods.map((m) => m.name).join(", "),
          data.paymentMethods[0]?.name,
        ) || undefined;
    }

    if (!method) return;

    try {
      const res = await fetch(`${API_URL}/orders/${orderId}/pay`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ paymentMethod: method }),
      });
      if (res.ok) {
        toast.success("Pedido marcado como pago!");
        fetchData();
      }
    } catch (err) {
      toast.error("Erro ao pagar");
    }
  };

  const removeProduct = async (id: string) => {
    if (!window.confirm("Deseja realmente EXCLUIR este produto permanentemente? Esta ação não pode ser desfeita.")) return;
    
    const loadingToast = toast.loading("Excluindo produto...", { id: "product-action" });
    try {
      const res = await fetch(`${API_URL}/admin/products/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        toast.success("Produto excluído com sucesso!", { id: "product-action" });
        fetchData();
      } else {
        toast.error("Erro ao excluir produto", { id: "product-action" });
      }
    } catch (err) {
      console.error(err);
      toast.error("Erro na conexão", { id: "product-action" });
    }
  };

  const deleteAllProducts = async () => {
    if (!window.confirm("ATENÇÃO: Deseja realmente EXCLUIR TODOS os produtos do sistema? Esta ação é irreversível!")) return;
    if (!window.confirm("VOCÊ TEM CERTEZA REAL? Todos os produtos serão apagados.")) return;

    const loadingToast = toast.loading("Excluindo todos os produtos...");
    try {
      const deletePromises = data.products.map(prod => 
        fetch(`${API_URL}/admin/products/${prod.id}`, {
          method: "DELETE",
          headers: { Authorization: `Bearer ${token}` },
        })
      );
      
      await Promise.all(deletePromises);
      toast.success("Todos os produtos foram excluídos!", { id: loadingToast });
      fetchData();
    } catch (err) {
      console.error(err);
      toast.error("Erro ao excluir produtos", { id: loadingToast });
    }
  };

  const editProductInfo = async (product: Product) => {
    const newName = window.prompt("Novo nome do produto:", product.name);
    if (newName === null) return;
    
    const newPriceStr = window.prompt("Novo preço (R$):", product.price.toString());
    if (newPriceStr === null) return;

    const newNameVal = newName.trim() || product.name;
    const newPriceVal = isNaN(Number(newPriceStr)) ? product.price : Number(newPriceStr);

    toast.loading("Atualizando produto...", { id: "product-action" });
    try {
      const res = await fetch(`${API_URL}/admin/products/${product.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ 
          name: newNameVal,
          price: newPriceVal
        }),
      });
      if (res.ok) {
        toast.success("Produto atualizado com sucesso!", { id: "product-action" });
        fetchData();
      } else {
        toast.error("Erro ao atualizar produto", { id: "product-action" });
      }
    } catch (err) {
      console.error(err);
      toast.error("Erro na conexão", { id: "product-action" });
    }
  };

  const openCash = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/admin/cash/open`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ initialValue: 0 }),
      });
      if (res.ok) {
        toast.success("Caixa aberto com sucesso!");
        setData(prev => ({ 
          ...prev, 
          cashRegister: { 
            ...prev.cashRegister, 
            isOpen: true, 
            openedAt: new Date().toISOString(), 
            openedBy: user?.name || "Adm" 
          } 
        }));
        await fetchData();
        if (user?.role === "admin") setView("tables");
      } else {
        const d = await res.json();
        toast.error(d.message || "Erro ao abrir caixa");
      }
    } catch (err) {
      toast.error("Erro ao abrir caixa");
    } finally {
      setLoading(false);
    }
  };

  const closeCash = async () => {
    setLoading(true);

    try {
      const res = await fetch(`${API_URL}/admin/cash/close`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        const result = await res.json();
        toast.success(
          `Caixa fechado! Total Vendas: R$ ${result.totalSales.toFixed(2)}`,
        );
        setData(prev => ({ 
          ...prev, 
          cashRegister: { 
            ...prev.cashRegister, 
            isOpen: false, 
            openedAt: null 
          } 
        }));
        await fetchData();
      } else {
        const errorData = await res.json();
        toast.error(errorData.message || "Erro ao fechar caixa");
      }
    } catch (err) {
      toast.error("Erro na conexão");
    } finally {
      setLoading(false);
    }
  };

  // --- RENDERING HELPERS ---

  if (view === "login") {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-slate-900 overflow-hidden relative">
        <div className="absolute top-0 right-0 w-64 h-64 bg-orange-500/20 rounded-full blur-3xl -mr-32 -mt-32"></div>
        <div className="absolute bottom-0 left-0 w-64 h-64 bg-blue-500/10 rounded-full blur-3xl -ml-32 -mb-32"></div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md bg-white rounded-3xl shadow-2xl p-8 z-10"
        >
          <div className="text-center mb-8">
            <div className="w-20 h-20 bg-orange-500 rounded-3xl flex items-center justify-center mx-auto mb-4 shadow-xl shadow-orange-500/20">
              <Utensils className="w-10 h-10 text-white" />
            </div>
            <h1 className="text-4xl font-black text-slate-800 tracking-tight">
              Meu Pedido
            </h1>
            <p className="text-slate-500 mt-2 font-medium">
              Gestão inteligente para seu restaurante
            </p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Usuário
              </label>
              <input
                name="username"
                type="text"
                required
                className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all"
                placeholder="Ex: joao_waiter"
                defaultValue="rafaelsantos458@gmail.com"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-2">
                Senha
              </label>
              <div className="relative">
                <input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 focus:ring-2 focus:ring-orange-500 focus:border-transparent outline-none transition-all"
                  placeholder="••••••••"
                  defaultValue="123"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 transition-colors"
                >
                  {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                </button>
              </div>
            </div>
            <button
              type="submit"
              className="w-full bg-orange-600 hover:bg-orange-700 text-white font-semibold py-4 rounded-xl shadow-lg shadow-orange-600/20 transition-all active:scale-95"
            >
              Entrar no Sistema
            </button>
          </form>

          <div className="mt-8 pt-8 border-t border-slate-100 text-center text-xs text-slate-400">
            Powered by RestaurantePro &copy; 2026
          </div>
        </motion.div>
        <Toaster position="bottom-left" />
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-20 bg-slate-50">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 sm:px-6 z-[1000] shadow-sm">
        <div className="flex items-center gap-2 sm:gap-3 flex-shrink-0 w-1/4">
          <div className="w-9 h-9 bg-orange-600 rounded-xl flex items-center justify-center text-white shadow-lg shadow-orange-600/20">
            <Utensils size={18} />
          </div>
          <span className="font-black text-slate-800 text-lg tracking-tight hidden lg:inline">
            Sistema Bar
          </span>
        </div>

        <nav className="hidden sm:flex items-center gap-6 bg-transparent px-4 py-1 flex-shrink-0">
          <button
            onClick={() => {
              setView("tables");
              setSelectedTable(null);
            }}
            className={`px-1 py-1 text-sm font-bold transition-all ${view === "tables" || view === "order" ? "text-slate-800 border-b-2 border-orange-500" : "text-slate-400 hover:text-slate-600"}`}
          >
            Mesa
          </button>
          <button
            onClick={() => setView("history")}
            className={`px-4 py-1.5 rounded-xl text-sm font-bold transition-all border-2 ${view === "history" ? "bg-white text-slate-800 border-slate-900 shadow-sm" : "border-transparent text-slate-400 hover:text-slate-600"}`}
          >
            Pedido
          </button>
          {user?.role === "admin" && (
            <button
              onClick={() => {
                setView("admin");
                setAdminTab("Painel");
              }}
              className={`px-1 py-1 text-sm font-bold transition-all ${view === "admin" && adminTab === "Painel" ? "text-slate-800 border-b-2 border-orange-500" : "text-slate-400 hover:text-slate-600"}`}
            >
              Painel
            </button>
          )}
          {user?.role === "admin" && (
            <button
              onClick={() => {
                setView("admin");
                setAdminTab("Configurações");
              }}
              className={`px-1 py-1 text-sm font-bold transition-all ${view === "admin" && adminTab === "Configurações" ? "text-orange-600" : "text-orange-400/70 hover:text-orange-500"}`}
            >
              Conta
            </button>
          )}
        </nav>

        <div className="flex items-center justify-end gap-1 sm:gap-2 flex-shrink-0 w-1/4">
          {user?.role === "admin" && (
            <button
              onClick={data.cashRegister?.isOpen ? closeCash : openCash}
              disabled={loading}
              className={`flex items-center gap-2 px-4 py-2 rounded-full font-black text-[10px] uppercase tracking-tighter transition-all active:scale-95 border cursor-pointer ${data.cashRegister?.isOpen ? "bg-emerald-500 text-white border-emerald-600 hover:bg-emerald-600" : "bg-red-500 text-white border-red-600 hover:bg-red-600"}`}
            >
              <div className={`w-2 h-2 rounded-full border border-white/20 ${data.cashRegister?.isOpen ? "bg-white animate-pulse" : "bg-white/40"}`}></div>
              {loading ? "..." : (data.cashRegister?.isOpen ? "Caixa Aberto" : "Caixa Fechado")}
            </button>
          )}
          <div className="hidden sm:flex flex-col items-end mr-1">
            <span className="text-xs font-bold text-slate-700 leading-none">
              {user?.name}
            </span>
            <span className="text-[9px] text-slate-400 font-medium uppercase tracking-wider">
              {user?.role === "admin" ? "Adm" : "Garçom"}
            </span>
          </div>
          <button
            onClick={handleLogout}
            className="p-2 text-slate-400 hover:text-red-500 transition-colors"
          >
            <LogOut size={20} />
          </button>
        </div>
      </header>

        {/* Main Content */}
        <main className="pt-20 px-4 max-w-6xl mx-auto">
          {/* Banners removidos a pedido do usuário para deixar manual */}

          <AnimatePresence mode="wait">
            {view === "tables" && (
            <motion.div
                key="tables"
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <h2 className="text-2xl font-bold text-slate-800">Mesas</h2>
                    {user?.role === "admin" && (
                      <div className="flex items-center gap-2 bg-slate-100 p-1 rounded-2xl">
                        <button
                          onClick={async () => {
                            const num = data.tables.length + 1;
                            const res = await fetch(`${API_URL}/admin/tables`, {
                              method: "POST",
                              headers: {
                                "Content-Type": "application/json",
                                Authorization: `Bearer ${token}`,
                              },
                              body: JSON.stringify({ number: num.toString().padStart(2, "0") }),
                            });
                            if (res.ok) {
                              toast.success(`Mesa ${num} adicionada!`);
                              fetchData();
                            }
                          }}
                          className="w-10 h-10 flex items-center justify-center bg-white rounded-xl text-emerald-600 shadow-sm border border-slate-100 hover:bg-emerald-50 transition-all font-black"
                        >
                          +
                        </button>
                        <button
                          onClick={async () => {
                            if (data.tables.length === 0) return;
                            const lastTable = data.tables[data.tables.length - 1];
                            if (lastTable.status === "occupied") {
                              toast.error("Não é possível remover mesa ocupada!");
                              return;
                            }
                            if (confirm(`Remover mesa ${lastTable.number}?`)) {
                              const res = await fetch(`${API_URL}/admin/tables/${lastTable.id}`, {
                                method: "DELETE",
                                headers: { Authorization: `Bearer ${token}` },
                              });
                              if (res.ok) {
                                toast.success(`Mesa ${lastTable.number} removida!`);
                                fetchData();
                              }
                            }
                          }}
                          className="w-10 h-10 flex items-center justify-center bg-white rounded-xl text-red-600 shadow-sm border border-slate-100 hover:bg-red-50 transition-all font-black"
                        >
                          -
                        </button>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2 text-xs">
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded-full bg-emerald-500"></div>{" "}
                      Livres
                    </div>
                    <div className="flex items-center gap-1">
                      <div className="w-3 h-3 rounded-full bg-orange-500"></div>{" "}
                      Ocupadas
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                  {data.tables.map((table) => {
                    const isOccupied = table.status === "occupied";
                    const pendingOrders = data.orders.filter(
                      (o) => o.tableId === table.id && o.status === "pending",
                    );

                    return (
                      <motion.button
                        key={table.id}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => {
                          setSelectedTable(table);
                          setView("order");
                        }}
                        className={`relative p-6 rounded-3xl border-2 transition-all flex flex-col items-center gap-3 ${
                          isOccupied
                            ? "border-orange-500 bg-orange-50 text-orange-900 shadow-lg shadow-orange-500/10"
                            : "border-slate-200 bg-white hover:border-emerald-500 text-slate-700"
                        }`}
                      >
                        <div
                          className={`p-4 rounded-2xl ${isOccupied ? "bg-orange-600 text-white" : "bg-slate-100 text-slate-400"}`}
                        >
                          <ChefHat size={32} />
                        </div>
                        <span className="text-sm font-medium">Mesa</span>
                        <span className="text-3xl font-black">
                          {table.number}
                        </span>

                        {isOccupied && (
                          <div className="flex flex-wrap justify-center gap-1 mt-2">
                            {pendingOrders.length > 0 && (
                              <span className="bg-orange-600 text-white text-[10px] font-bold px-2 py-0.5 rounded-full">
                                {pendingOrders.length} ped.
                              </span>
                            )}
                            <span className="bg-orange-200 text-orange-900 text-[10px] font-bold px-2 py-0.5 rounded-full">
                              Ocupada
                            </span>
                          </div>
                        )}

                        {/* Hover/Quick Action Overlay for Desktop, or always visible hint for Mobile */}
                        <div className="absolute inset-0 bg-orange-600/0 hover:bg-orange-600/5 transition-all rounded-3xl pointer-events-none"></div>
                      </motion.button>
                    );
                  })}
                </div>
              </motion.div>
            )}

          {view === "order" && selectedTable && (
            <motion.div
              key="order"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="grid lg:grid-cols-3 gap-8 pb-32"
            >
              {/* Left Column: Menu */}
              <div className="lg:col-span-2 space-y-6">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => {
                      setView("tables");
                      setCart([]);
                    }}
                    className="p-2 bg-white border border-slate-200 rounded-xl hover:bg-slate-50 transition-colors"
                  >
                    <ChevronRight size={24} className="rotate-180" />
                  </button>
                  <h2 className="text-2xl font-bold text-slate-800">
                    Mesa {selectedTable.number} - Pedido
                  </h2>
                </div>

                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none">
                    <Search size={18} className="text-slate-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Buscar prato ou bebida..."
                    className="w-full pl-12 pr-4 py-4 bg-white border border-slate-200 rounded-2xl shadow-sm focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                  />
                </div>

                <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide px-1">
                  <button
                    onClick={() => setSelectedCategory("all")}
                    className={`px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap shadow-sm border ${selectedCategory === "all" ? "bg-orange-600 text-white border-orange-600 scale-105" : "bg-white text-slate-400 border-slate-100"}`}
                  >
                    Todos
                  </button>
                  {data.categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`px-6 py-3 rounded-2xl text-xs font-black uppercase tracking-widest transition-all whitespace-nowrap shadow-sm border ${selectedCategory === cat.id ? "bg-orange-600 text-white border-orange-600 scale-105" : "bg-white text-slate-400 border-slate-100 hover:border-orange-200"}`}
                    >
                      {cat.name}
                    </button>
                  ))}
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {data.products
                    .filter(
                      (p) =>
                        selectedCategory === "all" ||
                        p.categoryId === selectedCategory,
                    )
                    .filter((p) =>
                      p.name.toLowerCase().includes(searchQuery.toLowerCase()),
                    )
                    .map((prod) => (
                      <div
                        key={prod.id}
                        className="bg-white p-4 rounded-3xl border border-slate-100 shadow-sm flex items-center justify-between hover:border-orange-200 transition-all group"
                      >
                        <div className="flex items-center gap-4">
                          <div className="w-16 h-16 bg-slate-50 rounded-2xl flex items-center justify-center text-slate-400 group-hover:text-orange-500 transition-colors">
                            {prod.categoryId === "1" || prod.categoryId?.toLowerCase().includes("bebida") ? (
                              <Beer size={32} />
                            ) : prod.categoryId === "2" || prod.categoryId?.toLowerCase().includes("prato") ? (
                              <Pizza size={32} />
                            ) : prod.categoryId === "3" || prod.categoryId?.toLowerCase().includes("sobrem") ? (
                              <IceCream size={32} />
                            ) : (
                              <Utensils size={32} />
                            )}
                          </div>
                          <div>
                            <h3 className="font-bold text-slate-800">
                              {prod.name}
                            </h3>
                            <p className="text-lg font-black text-orange-600">
                              R$ {prod.price.toFixed(2)}
                            </p>
                          </div>
                        </div>
                        <button
                          onClick={() => addToCart(prod)}
                          className="w-12 h-12 bg-orange-50 text-orange-600 rounded-2xl flex items-center justify-center hover:bg-orange-600 hover:text-white transition-all active:scale-90"
                        >
                          <Plus size={24} />
                        </button>
                      </div>
                    ))}
                </div>
              </div>

              {/* Right Column: Cart Summary */}
              <div className="space-y-6">
                <div className="bg-white rounded-3xl p-6 border border-slate-200 shadow-xl sticky top-24">
                  <div className="flex items-center gap-2 mb-6 text-slate-800 border-b border-slate-100 pb-4">
                    <ShoppingCart size={20} className="text-orange-600" />
                    <h3 className="text-xl font-bold">Resumo</h3>
                  </div>

                  {cart.length === 0 ? (
                    <div className="py-12 text-center text-slate-400 space-y-4">
                      <div className="w-16 h-16 bg-slate-50 rounded-full flex items-center justify-center mx-auto opacity-50">
                        <History size={32} />
                      </div>
                      <p>Nenhum item selecionado</p>
                    </div>
                  ) : (
                    <div className="space-y-4 mb-8 max-h-[40vh] overflow-y-auto pr-2 custom-scrollbar">
                      {cart.map((item) => (
                        <div
                          key={item.productId}
                          className="flex flex-col gap-2 p-3 bg-slate-50 rounded-2xl"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-slate-700 flex-1">
                              {item.name}
                            </span>
                            <button
                              onClick={() => removeFromCart(item.productId)}
                              className="text-red-400 hover:text-red-600 p-1"
                            >
                              <Trash2 size={18} />
                            </button>
                          </div>
                            <div className="flex items-center justify-between text-sm">
                              <div className="flex flex-col">
                                <span className="font-bold text-slate-900 leading-none">
                                  R$ {(item.price * item.quantity).toFixed(2)}
                                </span>
                                <span className="text-[10px] text-slate-400 font-medium">
                                  Unit: R$ {item.price.toFixed(2)}
                                </span>
                              </div>
                              <div className="flex items-center gap-3 bg-white px-2 py-1 rounded-xl shadow-sm border border-slate-100">
                                <button
                                  onClick={() =>
                                    updateQuantity(item.productId, -1)
                                  }
                                  className="p-1 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                                >
                                  <Minus size={16} />
                                </button>
                                <input
                                  type="number"
                                  value={item.quantity}
                                  onChange={(e) => updateCartManual(item.productId, e.target.value)}
                                  className="font-black w-10 text-center bg-transparent border-none outline-none focus:ring-0 p-0 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                                />
                                <button
                                  onClick={() =>
                                    updateQuantity(item.productId, 1)
                                  }
                                  className="p-1 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                                >
                                  <Plus size={16} />
                                </button>
                              </div>
                            </div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="space-y-4 pt-4 border-t border-slate-100">
                    <div>
                      <label className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2 block">
                        Observações
                      </label>
                      <textarea
                        className="w-full p-4 bg-slate-50 border border-slate-100 rounded-2xl text-sm focus:ring-2 focus:ring-orange-500 outline-none resize-none transition-all"
                        placeholder="Ex: sem cebola..."
                        rows={2}
                        value={observations}
                        onChange={(e) => setObservations(e.target.value)}
                      />
                    </div>

                    <div className="flex items-center justify-between text-slate-800">
                      <span className="text-lg font-bold">Total</span>
                      <span className="text-3xl font-black text-orange-600">
                        R$ {cartTotal.toFixed(2)}
                      </span>
                    </div>

                    <button
                      disabled={cart.length === 0 || loading}
                      onClick={submitOrder}
                      className="w-full bg-orange-600 disabled:opacity-50 disabled:bg-slate-400 text-white font-bold py-5 rounded-2xl shadow-xl shadow-orange-600/20 active:scale-95 transition-all flex items-center justify-center gap-2"
                    >
                      {loading ? (
                        "Processando..."
                      ) : (
                        <>
                          <Printer size={20} />
                          Finalizar e Imprimir
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </motion.div>
          )}

          {view === "admin" && (
            <motion.div
              key="admin"
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="space-y-8 pb-32"
            >
                <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide py-2">
                  {["Painel", "Caixa", "Equipe", "Cardápio", "Configurações"].map(
                    (tab) => (
                      <button
                        key={tab}
                        onClick={() => setAdminTab(tab)}
                        className={`px-6 py-2 rounded-2xl text-xs font-black uppercase tracking-widest transition-all ${adminTab === tab ? "bg-orange-600 text-white shadow-lg" : "bg-white text-slate-400 border border-slate-100"}`}
                      >
                        {tab}
                      </button>
                    ),
                  )}
                </div>

                {adminTab === "Caixa" && (
                  <div className="space-y-6">
                    <div className="bg-white p-8 rounded-[2.5rem] border border-slate-100 shadow-sm text-center">
                      <div className={`w-20 h-20 mx-auto rounded-3xl flex items-center justify-center mb-6 ${data.cashRegister?.isOpen ? "bg-emerald-100 text-emerald-600" : "bg-red-100 text-red-600"}`}>
                        {data.cashRegister?.isOpen ? <CheckCircle2 size={40} /> : <EyeOff size={40} />}
                      </div>
                      <h2 className="text-2xl font-black text-slate-800 mb-2">
                        Caixa está {data.cashRegister?.isOpen ? "Aberto" : "Fechado"}
                      </h2>
                      <p className="text-slate-500 mb-4 max-w-xs mx-auto">
                        {data.cashRegister?.isOpen 
                          ? `Aberto em ${new Date(data.cashRegister.openedAt!).toLocaleString()} por ${data.cashRegister.openedBy}`
                          : "O controle de abertura e fechamento agora é feito no atalho superior direito."}
                      </p>
                    </div>

                    <div className="bg-white rounded-[2.5rem] p-8 border border-slate-100 shadow-sm">
                      <h3 className="font-black text-slate-800 mb-6 flex items-center gap-2">
                        <History size={20} className="text-orange-600" />
                        Histórico Recente
                      </h3>
                      <div className="space-y-4">
                        {data.cashRegister?.history?.slice().reverse().map((h, i) => (
                          <div key={i} className="flex items-center justify-between p-4 bg-slate-50 rounded-2xl border border-slate-100">
                            <div>
                              <p className="text-xs font-bold text-slate-400 uppercase tracking-widest">Abertura: {new Date(h.openedAt).toLocaleDateString()}</p>
                              <p className="font-bold text-slate-700">R$ {h.totalSales.toFixed(2)}</p>
                            </div>
                            <div className="text-right">
                              <p className="text-xs font-medium text-slate-400 capitalize">{h.openedBy}</p>
                              <p className="text-[10px] font-black text-emerald-600 uppercase">{h.ordersCount} pedidos</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

              {adminTab === "Painel" && (
                <>
                  {/* Stats Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                    {[
                      {
                        label: "Vendas Hoje",
                        value: `R$ ${data.orders.reduce((acc, o) => acc + (o.status === "finished" ? o.total : 0), 0).toFixed(2)}`,
                        icon: TrendingUp,
                        color: "bg-emerald-100 text-emerald-600",
                      },
                      {
                        label: "Pedidos Pendentes",
                        value: data.orders.filter((o) => o.status === "pending")
                          .length,
                        icon: ClipboardList,
                        color: "bg-orange-100 text-orange-600",
                      },
                      {
                        label: "Mesas Ocupadas",
                        value: data.tables.filter(
                          (t) => t.status === "occupied",
                        ).length,
                        icon: ChefHat,
                        color: "bg-blue-100 text-blue-600",
                      },
                      {
                        label: "Atendimento Médio",
                        value: "18 min",
                        icon: Clock,
                        color: "bg-purple-100 text-purple-600",
                      },
                    ].map((stat, i) => (
                      <button
                        key={i}
                        onClick={() => {
                          if (stat.label.includes("Pedido")) setAdminTab("Painel");
                          if (stat.label.includes("Mesa")) setAdminTab("Painel");
                        }}
                        className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm flex items-center gap-4 text-left active:scale-95 transition-all"
                      >
                        <div
                          className={`w-14 h-14 ${stat.color} rounded-2xl flex items-center justify-center`}
                        >
                          <stat.icon size={28} />
                        </div>
                        <div>
                          <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                            {stat.label}
                          </p>
                          <h4 className="text-xl font-black text-slate-800">
                            {stat.value}
                          </h4>
                        </div>
                      </button>
                    ))}
                  </div>

                  <div className="grid lg:grid-cols-2 gap-8">
                    {/* Recent Orders List */}
                    <div className="bg-white rounded-3xl border border-slate-200 overflow-hidden shadow-sm">
                      <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
                        <h3 className="font-bold text-slate-800 flex items-center gap-2">
                          <History className="text-orange-600" size={20} />
                          Pedidos Ativos
                        </h3>
                      </div>
                      <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
                        {data.orders.filter((o) => o.status === "pending")
                          .length === 0 ? (
                          <div className="p-12 text-center text-slate-400 italic">
                            Nenhum pedido ativo no momento
                          </div>
                        ) : (
                          data.orders
                            .filter((o) => o.status === "pending")
                            .map((order) => (
                              <div
                                key={order.id}
                                className="p-6 hover:bg-slate-50 transition-colors"
                              >
                                <div className="flex items-center justify-between mb-2">
                                  <span className="px-3 py-1 bg-orange-100 text-orange-600 text-xs font-bold rounded-full">
                                    Mesa{" "}
                                    {
                                      data.tables.find(
                                        (t) => t.id === order.tableId,
                                      )?.number
                                    }
                                  </span>
                                  <span className="text-xs text-slate-400 font-medium">
                                    {new Date(
                                      order.createdAt,
                                    ).toLocaleTimeString()}
                                  </span>
                                </div>
                                <div className="space-y-1 mb-4">
                                  {order.items.map((it, idx) => (
                                    <p
                                      key={idx}
                                      className="text-sm text-slate-600 flex justify-between"
                                    >
                                      <span>
                                        {it.quantity}x {it.name}
                                      </span>
                                      <span className="font-bold">
                                        R$ {(it.price * it.quantity).toFixed(2)}
                                      </span>
                                    </p>
                                  ))}
                                </div>
                                <div className="flex items-center justify-between">
                                  <div className="flex items-center gap-2 text-xs text-slate-400 font-medium">
                                    <User size={14} />
                                    {order.waiterName}
                                  </div>
                                  <button
                                    onClick={() => finishOrder(order)}
                                    className="text-emerald-500 hover:text-emerald-600 text-xs font-bold flex items-center gap-1 bg-emerald-50 px-3 py-1.5 rounded-xl transition-all active:scale-95"
                                  >
                                    Finalizar <CheckCircle2 size={14} />
                                  </button>
                                </div>
                              </div>
                            ))
                            .reverse()
                        )}
                      </div>
                    </div>

                    <div className="space-y-6">
                      <div className="bg-white rounded-3xl border border-slate-200 p-8 shadow-sm h-full">
                        <h3 className="font-bold text-slate-800 mb-6 flex items-center gap-2">
                          <Users className="text-orange-600" size={20} />
                          Garçons Ativos no Dia
                        </h3>
                        <div className="space-y-4">
                          {(data.users || []).filter(
                            (u) =>
                              u.role === "waiter" &&
                              (data.orders || []).some(
                                (o) =>
                                  o.waiterId === u.id &&
                                  new Date(o.createdAt).toDateString() ===
                                    new Date().toDateString(),
                              ),
                          ).length === 0 ? (
                            <div className="text-center py-8 text-slate-400 text-xs italic">
                              Nenhum garçom ativo hoje
                            </div>
                          ) : (
                            (data.users || [])
                              .filter(
                                (u) =>
                                  u.role === "waiter" &&
                                  (data.orders || []).some(
                                    (o) =>
                                      o.waiterId === u.id &&
                                      new Date(o.createdAt).toDateString() ===
                                        new Date().toDateString(),
                                  ),
                              )
                              .map((waiter) => {
                                const waiterOrders = data.orders.filter(
                                  (o) =>
                                    o.waiterId === waiter.id &&
                                    new Date(o.createdAt).toDateString() ===
                                      new Date().toDateString(),
                                );
                                const totalSales = waiterOrders.reduce(
                                  (acc, o) => acc + o.total,
                                  0,
                                );
                                return (
                                  <div
                                    key={waiter.id}
                                    className="p-4 bg-slate-50 rounded-2xl flex items-center justify-between"
                                  >
                                    <div className="flex items-center gap-3">
                                      <div className="w-10 h-10 bg-orange-100 rounded-xl flex items-center justify-center text-orange-600 font-bold">
                                        {waiter.name.charAt(0)}
                                      </div>
                                      <div>
                                        <p className="font-bold text-slate-800 text-sm">
                                          {waiter.name}
                                        </p>
                                        <p className="text-[10px] text-slate-400 font-bold uppercase tracking-widest">
                                          {waiterOrders.length} Pedidos
                                        </p>
                                      </div>
                                    </div>
                                    <span className="text-sm font-black text-emerald-600">
                                      R$ {totalSales.toFixed(2)}
                                    </span>
                                  </div>
                                );
                              })
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </>
              )}

              {adminTab === "Equipe" && (
                <div className="bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-sm space-y-8">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-2xl font-black text-slate-800">
                        Equipe e Garçons
                      </h3>
                      <p className="text-slate-400 font-medium">
                        Cadastre e gerencie os acessos mobile.
                      </p>
                    </div>
                    <Users size={40} className="text-orange-500 opacity-20" />
                  </div>

                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const f = new FormData(e.currentTarget);
                      const res = await fetch("/api/admin/users", {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                          Authorization: `Bearer ${token}`,
                        },
                        body: JSON.stringify({
                          name: f.get("name"),
                          username: f.get("username"),
                          password: f.get("password"),
                          role: "waiter",
                        }),
                      });
                      if (res.ok) {
                        toast.success("Garçom cadastrado!");
                        (e.target as HTMLFormElement).reset();
                        fetchUsers();
                      }
                    }}
                    className="grid md:grid-cols-4 gap-4 bg-slate-50 p-6 rounded-[2rem]"
                  >
                    <input
                      name="name"
                      placeholder="Nome Completo"
                      required
                      className="p-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-orange-500"
                    />
                    <input
                      name="username"
                      placeholder="Usuário/Email"
                      required
                      className="p-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-orange-500"
                    />
                    <input
                      name="password"
                      placeholder="Senha"
                      type="password"
                      required
                      className="p-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-orange-500"
                    />
                    <button className="bg-orange-600 text-white font-bold py-3 rounded-xl shadow-lg shadow-orange-600/20 active:scale-95 transition-all">
                      Cadastrar
                    </button>
                  </form>

                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
                    {adminUsers
                      .filter((u) => u.role === "waiter")
                      .map((waiter) => (
                        <div
                          key={waiter.id}
                          className="p-6 bg-white border border-slate-100 rounded-3xl flex items-center gap-4 shadow-sm"
                        >
                          <div className="w-12 h-12 bg-orange-100 rounded-2xl flex items-center justify-center text-orange-600">
                            <User size={24} />
                          </div>
                          <div>
                            <p className="font-bold text-slate-800">
                              {waiter.name}
                            </p>
                            <p className="text-[10px] font-black text-emerald-600 uppercase tracking-widest flex items-center gap-1">
                              <Smartphone size={12} /> Acesso Ativo
                            </p>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {adminTab === "Cardápio" && (
                <div className="bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-sm space-y-8">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-2xl font-black text-slate-800">
                        Controle do Cardápio
                      </h3>
                      <p className="text-slate-400 font-medium">
                        Gerencie itens e preços do seu estabelecimento.
                      </p>
                    </div>
                    <div className="flex gap-2 items-center">
                      <ShoppingCart
                        size={40}
                        className="text-orange-500 opacity-20"
                      />
                    </div>
                  </div>

                  <form
                    onSubmit={async (e) => {
                      e.preventDefault();
                      const f = new FormData(e.currentTarget);
                      const res = await fetch("/api/admin/products", {
                        method: "POST",
                        headers: {
                          "Content-Type": "application/json",
                          Authorization: `Bearer ${token}`,
                        },
                        body: JSON.stringify({
                          name: f.get("name"),
                          price: f.get("price"),
                          categoryId: f.get("categoryId"),
                        }),
                      });
                      if (res.ok) {
                        toast.success("Produto adicionado!");
                        (e.target as HTMLFormElement).reset();
                        fetchData();
                      }
                    }}
                    className="grid md:grid-cols-5 gap-4 bg-slate-50 p-6 rounded-[2rem]"
                  >
                    <input
                      name="name"
                      placeholder="Item"
                      required
                      className="p-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-orange-500"
                    />
                    <input
                      name="price"
                      placeholder="Preço"
                      type="number"
                      step="0.01"
                      required
                      className="p-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-orange-500"
                    />
                    <select
                      name="categoryId"
                      id="categorySelect"
                      className="p-3 rounded-xl border border-slate-200 outline-none focus:ring-2 focus:ring-orange-500 bg-white"
                    >
                      {data.categories.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.name}
                        </option>
                      ))}
                    </select>
                    <button className="bg-orange-600 text-white font-bold py-3 rounded-xl shadow-lg shadow-orange-600/20 active:scale-95 transition-all md:col-span-2">
                      Salvar Novo Produto
                    </button>
                  </form>

                  <div className="flex flex-wrap items-center justify-between py-4 border-y border-slate-100 gap-4">
                    <h4 className="text-sm font-black text-slate-800 uppercase tracking-widest">Lista de Produtos</h4>
                    <div className="flex gap-2">
                      <button 
                        type="button"
                        onClick={deleteAllProducts}
                        className="px-4 py-2 bg-red-50 text-red-600 rounded-xl text-[10px] font-black uppercase tracking-widest hover:bg-red-600 hover:text-white transition-all border border-red-100 active:scale-95 cursor-pointer"
                      >
                        Excluir Tudo
                      </button>
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {data.products
                      .map((prod) => (
                        <div
                          key={prod.id}
                          className="p-6 bg-white border border-slate-100 rounded-3xl shadow-sm space-y-4 group transition-all"
                        >
                          <div className="flex justify-between items-start">
                            <div>
                              <div className="flex items-center gap-2">
                                <h4 className="font-bold text-slate-800">
                                  {prod.name}
                                </h4>
                              </div>
                              <p className="text-xs text-slate-400">
                                {
                                  data.categories.find(
                                    (c) => c.id === prod.categoryId,
                                  )?.name
                                }
                              </p>
                            </div>
                            <span className="text-orange-600 font-black">
                              R$ {prod.price.toFixed(2)}
                            </span>
                          </div>

                          <div className="flex flex-col gap-3">
                            <div className="flex gap-2">
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  editProductInfo(prod);
                                }}
                                className="flex-1 py-3 bg-blue-50 text-[9px] font-black text-blue-600 uppercase tracking-widest rounded-xl hover:bg-blue-100 transition-all text-center border border-blue-100 active:scale-95 cursor-pointer"
                              >
                                Editar
                              </button>
                              <button
                                type="button"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  removeProduct(prod.id);
                                }}
                                className="flex-1 py-3 bg-red-50 text-[9px] font-black text-red-500 uppercase tracking-widest rounded-xl hover:bg-red-600 hover:text-white transition-all text-center border border-red-100 active:scale-95 cursor-pointer"
                              >
                                Excluir
                              </button>
                            </div>
                          </div>
                        </div>
                      ))}
                  </div>
                </div>
              )}

              {adminTab === "Configurações" && (
                <div className="bg-white rounded-[2.5rem] p-8 border border-slate-200 shadow-sm space-y-8">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-2xl font-black text-slate-800">
                        Histórico de Caixa
                      </h3>
                      <p className="text-slate-400 font-medium">
                        Relatórios detalhados dos fechamentos.
                      </p>
                    </div>
                    <FileText
                      size={40}
                      className="text-orange-500 opacity-20"
                    />
                  </div>

                  <div className="overflow-x-auto">
                    <table className="w-full text-left">
                      <thead>
                        <tr className="text-xs font-black text-slate-400 uppercase tracking-widest border-b border-slate-100 pb-4 text-center">
                          <th className="pb-4 text-left">Resumo (Abertura/Fechamento)</th>
                          <th className="pb-4">Operador</th>
                          <th className="pb-4">Fundo de Caixa</th>
                          <th className="pb-4">Vendas</th>
                          <th className="pb-4">Total Geral</th>
                          <th className="pb-4">Ação</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-slate-100">
                        {data.cashRegister?.history?.map((h, i) => (
                          <tr
                            key={i}
                            className="hover:bg-slate-50 transition-colors text-center"
                          >
                            <td className="py-4 text-left">
                              <p className="font-bold text-slate-700">
                                {new Date(h.closedAt).toLocaleString()}
                              </p>
                              <p className="text-[10px] text-slate-400 font-bold uppercase">
                                Aberto em: {new Date(h.openedAt).toLocaleString()}
                              </p>
                            </td>
                            <td className="py-4 text-slate-500 text-sm">
                              {h.openedBy}
                            </td>
                            <td className="py-4 text-slate-600 font-bold text-sm">
                              R$ {h.initialValue.toFixed(2)}
                            </td>
                            <td className="py-4 font-black text-emerald-600 text-sm">
                              R$ {h.totalSales.toFixed(2)}
                            </td>
                            <td className="py-4 font-black text-slate-800 text-sm">
                              R$ {(h.initialValue + h.totalSales).toFixed(2)}
                            </td>
                            <td className="py-4">
                              <button
                                onClick={() => generatePDFReport(h)}
                                className="p-2 text-slate-400 hover:text-orange-600"
                              >
                                <Printer size={18} />
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </motion.div>
          )}

          {view === "settings" && (
            <motion.div
              key="settings"
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              className="max-w-4xl mx-auto space-y-8 pb-32"
            >
              <div className="bg-white rounded-[2.5rem] border border-slate-200 shadow-sm p-10">
                <div className="flex flex-col sm:flex-row items-center gap-8 mb-12">
                  <div className="w-28 h-28 bg-orange-100 rounded-[2.5rem] flex items-center justify-center text-orange-600 shadow-inner">
                    <User size={56} strokeWidth={1.5} />
                  </div>
                  <div className="text-center sm:text-left">
                    <h2 className="text-3xl font-black text-slate-800 tracking-tight leading-tight">
                      {user?.name}
                    </h2>
                    <div className="flex flex-wrap justify-center sm:justify-start gap-2 mt-2">
                      <span className="px-3 py-1 bg-slate-100 text-slate-500 font-bold uppercase text-[10px] tracking-widest rounded-full">
                        {user?.role === "admin" ? "Administrador" : "Garçom"}
                      </span>
                      <span className="px-3 py-1 bg-emerald-100 text-emerald-600 font-bold uppercase text-[10px] tracking-widest rounded-full flex items-center gap-1">
                        <CheckCircle2 size={12} /> Online
                      </span>
                    </div>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-4">
                  <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 flex items-center justify-between transition-all hover:bg-white hover:shadow-md">
                    <div className="flex items-center gap-4">
                      <div className="p-3 bg-blue-100 text-blue-600 rounded-2xl">
                        <Smartphone size={24} />
                      </div>
                      <div>
                        <p className="font-bold text-slate-800">
                          Interface Mobile
                        </p>
                        <p className="text-xs text-slate-400 font-medium">
                          Otimizada para Garçons
                        </p>
                      </div>
                    </div>
                    <div className="w-10 h-6 bg-emerald-500 rounded-full flex items-center px-1">
                      <div className="w-4 h-4 bg-white rounded-full ml-auto shadow-sm"></div>
                    </div>
                  </div>

                  <div className="p-6 bg-slate-50 rounded-[2rem] border border-slate-100 flex items-center justify-between transition-all hover:bg-white hover:shadow-md">
                    <div className="flex items-center gap-4">
                      <div
                        className={`p-3 ${notificationsEnabled ? "bg-emerald-100 text-emerald-600" : "bg-orange-100 text-orange-600"} rounded-2xl`}
                      >
                        <Smartphone size={24} />
                      </div>
                      <div>
                        <p className="font-bold text-slate-800">
                          Notificações Push
                        </p>
                        <p className="text-xs text-slate-400 font-medium">
                          {notificationsEnabled ? "Ativas" : "Inativas"}
                        </p>
                      </div>
                    </div>
                    {!notificationsEnabled && (
                      <button
                        onClick={() =>
                          Notification.requestPermission().then((p) =>
                            setNotificationsEnabled(p === "granted"),
                          )
                        }
                        className="text-[10px] font-black text-orange-600 uppercase tracking-widest bg-white px-4 py-2 rounded-xl border border-orange-100 shadow-sm"
                      >
                        Ligar
                      </button>
                    )}
                  </div>
                </div>

                <button
                  onClick={handleLogout}
                  className="w-full mt-10 bg-red-50 text-red-600 font-black py-5 rounded-[2rem] border border-red-100 hover:bg-red-600 hover:text-white transition-all active:scale-95 flex items-center justify-center gap-3 uppercase tracking-widest text-xs"
                >
                  <LogOut size={20} /> Encerrar Sessão
                </button>
              </div>
            </motion.div>
          )}

                    {view === "history" && (
                      <motion.div
                        key="history"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="space-y-6 pb-32"
                      >
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <h2 className="text-2xl font-bold text-slate-800">
                  Histórico de Pedidos
                </h2>
                <div className="relative w-full sm:w-72">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Search size={16} className="text-slate-400" />
                  </div>
                  <input
                    type="text"
                    placeholder="Buscar por ID ou Garçom..."
                    className="w-full pl-10 pr-4 py-2 text-sm bg-white border border-slate-200 rounded-xl focus:ring-2 focus:ring-orange-500 outline-none transition-all"
                    value={historySearch}
                    onChange={(e) => setHistorySearch(e.target.value)}
                  />
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {data.orders
                  .filter((o) => user?.role === "admin" ? true : o.waiterId === user?.id)
                  .filter(
                    (o) =>
                      o.id
                        .toLowerCase()
                        .includes(historySearch.toLowerCase()) ||
                      o.waiterName
                        .toLowerCase()
                        .includes(historySearch.toLowerCase()),
                  )
                  .map((order) => (
                    <div
                      key={order.id}
                      onClick={() => {
                        setHistoryDetailOrder(order);
                        setShowHistoryDetailModal(true);
                      }}
                      className="bg-white p-6 rounded-3xl border border-slate-100 shadow-sm cursor-pointer hover:border-orange-200 hover:shadow-md transition-all active:scale-[0.99]"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <span className="font-black text-xl text-slate-800">
                          #{order.id.slice(0, 4)}
                        </span>
                        <span className="text-xs font-bold text-slate-400">
                          {new Date(order.createdAt).toLocaleDateString()}
                        </span>
                      </div>
                      <div className="space-y-1 mb-4 text-sm text-slate-500 border-l-2 border-slate-100 pl-4">
                        {order.items.slice(0, 3).map((it, i) => (
                          <p key={i}>
                            {it.quantity}x {it.name}
                          </p>
                        ))}
                        {order.items.length > 3 && (
                          <p className="text-xs italic">
                            + {order.items.length - 3} itens
                          </p>
                        )}
                      </div>
                      <div className="pt-4 border-t border-slate-50 flex items-center justify-between">
                        <div className="flex flex-col">
                          <span className="text-lg font-black text-slate-900">
                            R$ {order.total.toFixed(2)}
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium">
                            {order.paymentMethod || "A pagar"}
                          </span>
                        </div>
                        <div className="flex flex-col items-end gap-1">
                          <div className="flex items-center gap-1 text-[10px] text-slate-400 font-bold uppercase tracking-tighter">
                            <Users size={12} />
                            {order.waiterName}
                          </div>
                          {order.isPaid ? (
                            <span className="text-[10px] px-2 py-0.5 bg-emerald-100 text-emerald-600 rounded-full font-bold uppercase">
                              Pago
                            </span>
                          ) : (
                            <button
                              onClick={() => payOrder(order.id)}
                              className="text-[10px] px-2 py-0.5 bg-orange-100 text-orange-600 rounded-full font-bold uppercase hover:bg-orange-600 hover:text-white transition-all"
                            >
                              Marcar Pago
                            </button>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <AnimatePresence>
          {showPaymentModal && paymentOrder && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="bg-white w-full max-w-2xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[90vh]"
              >
                <div className="p-8 border-b border-slate-100">
                  <div className="flex justify-between items-center mb-2">
                    <h2 className="text-2xl font-black text-slate-800">
                      Finalizar Conta - Mesa{" "}
                      {
                        data.tables.find((t) => t.id === paymentOrder.tableId)
                          ?.number
                      }
                    </h2>
                    <button
                      onClick={() => setShowPaymentModal(false)}
                      className="p-2 hover:bg-slate-100 rounded-full text-slate-400"
                    >
                      <X size={24} />
                    </button>
                  </div>
                  <p className="text-slate-400 font-medium">
                    Confira os itens consumidos antes de fechar.
                  </p>
                </div>

                <div className="flex-1 overflow-y-auto p-8 space-y-8 custom-scrollbar">
                  <div>
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">
                      Consumo Atual
                    </h3>
                    <div className="space-y-3">
                      {paymentOrder.items.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl group"
                        >
                          <div className="flex items-center gap-3">
                            <span className="w-8 h-8 bg-white rounded-lg flex items-center justify-center font-bold text-slate-800 shadow-sm">
                              {item.quantity}x
                            </span>
                            <span className="font-bold text-slate-700">
                              {item.name}
                            </span>
                          </div>
                          <span className="font-black text-slate-900">
                            R$ {(item.price * item.quantity).toFixed(2)}
                          </span>
                        </div>
                      ))}
                      {paymentCart.map((item, idx) => (
                        <div
                          key={`extra-${idx}`}
                          className="flex justify-between items-center bg-orange-50 p-4 rounded-2xl border border-orange-100 italic"
                        >
                          <div className="flex flex-col gap-2 flex-1">
                            <span className="font-bold text-orange-700">
                              {item.name} (Adicional)
                            </span>
                            <div className="flex items-center gap-3 bg-white w-fit px-2 py-1 rounded-xl shadow-sm border border-orange-100 not-italic">
                              <button
                                onClick={() => updatePaymentCartQuantity(idx, -1)}
                                className="p-1 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                              >
                                <Minus size={14} />
                              </button>
                              <input
                                type="number"
                                value={item.quantity}
                                onChange={(e) => updatePaymentCartManual(idx, e.target.value)}
                                className="font-black w-10 text-center bg-transparent border-none outline-none focus:ring-0 p-0 text-xs [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                              />
                              <button
                                onClick={() => updatePaymentCartQuantity(idx, 1)}
                                className="p-1 text-orange-600 hover:bg-orange-50 rounded-lg transition-colors"
                              >
                                <Plus size={14} />
                              </button>
                            </div>
                          </div>
                          <div className="flex items-center gap-4">
                            <div className="flex flex-col items-end">
                              <span className="font-black text-orange-900 not-italic">
                                R$ {(item.price * item.quantity).toFixed(2)}
                              </span>
                              <span className="text-[10px] text-orange-400 font-medium not-italic">
                                R$ {item.price.toFixed(2)}/un
                              </span>
                            </div>
                            <button
                              onClick={() =>
                                setPaymentCart((p) =>
                                  p.filter((_, i) => i !== idx),
                                )
                              }
                              className="p-2 bg-white rounded-xl text-red-400 hover:text-red-600 shadow-sm border border-orange-100 transition-colors"
                            >
                              <Trash2 size={16} />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div>
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">
                      Adicionar mais coisas? (doces, balas, extras)
                    </h3>
                    <div className="flex gap-2 overflow-x-auto pb-4 scrollbar-hide">
                      {data.products
                        .filter((p) => p.categoryId === "extras" || p.price < 5)
                        .map((p) => (
                          <button
                            key={p.id}
                            onClick={() => {
                              const promptPrice = window.prompt(`Confirmar preço unitário para "${p.name}":`, p.price.toString());
                              if (promptPrice === null) return;
                              const finalPrice = isNaN(Number(promptPrice)) ? p.price : Number(promptPrice);

                              setPaymentCart((prev) => {
                                // Agrupar apenas se for o mesmo ID e o mesmo Preço
                                const ex = prev.find(
                                  (i) => i.productId === p.id && i.price === finalPrice,
                                );
                                if (ex)
                                  return prev.map((i) =>
                                    i.productId === p.id && i.price === finalPrice
                                      ? { ...i, quantity: i.quantity + 1 }
                                      : i,
                                  );
                                return [
                                  ...prev,
                                  {
                                    productId: p.id,
                                    name: p.name,
                                    price: finalPrice,
                                    quantity: 1,
                                  },
                                ];
                              });
                            }}
                            className="px-6 py-4 bg-white border border-slate-200 rounded-2xl text-sm font-bold shadow-sm whitespace-nowrap active:scale-95 transition-all hover:border-orange-500 hover:text-orange-600"
                          >
                            + {p.name} (R$ {p.price.toFixed(2)})
                          </button>
                        ))}
                    </div>
                  </div>

                  <div className="pt-6 border-t border-slate-100 space-y-4">
                    <div className="flex justify-between items-center text-slate-400 font-bold uppercase text-[10px] tracking-widest">
                      <span>Subtotal</span>
                      <span>
                        R${" "}
                        {(
                          paymentOrder.total +
                          paymentCart.reduce(
                            (acc, i) => acc + i.price * i.quantity,
                            0,
                          )
                        ).toFixed(2)}
                      </span>
                    </div>
                    <div className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-100">
                      <div className="flex items-center gap-3 text-slate-500">
                        <LayoutDashboard size={18} />
                        <span className="text-xs font-bold uppercase tracking-widest">
                          Desconto
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <span className="text-slate-400 font-bold">R$</span>
                        <input
                          type="number"
                          step="0.01"
                          value={paymentDiscount}
                          onChange={(e) =>
                            setPaymentDiscount(Number(e.target.value))
                          }
                          className="w-24 bg-white border border-slate-200 rounded-xl p-2 text-right font-black text-emerald-600 outline-none focus:ring-2 focus:ring-emerald-500"
                        />
                      </div>
                    </div>

                    <div className="space-y-4 pt-4 border-t border-slate-100">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3 text-slate-500">
                          <Coins size={18} />
                          <span className="text-xs font-bold uppercase tracking-widest">
                            Gorjeta (Opcional)
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-400 font-bold">R$</span>
                          <input
                            type="number"
                            step="0.01"
                            value={paymentTip}
                            onChange={(e) =>
                              setPaymentTip(Number(e.target.value))
                            }
                            className="w-24 bg-white border border-slate-200 rounded-xl p-2 text-right font-black text-orange-600 outline-none focus:ring-2 focus:ring-orange-500"
                          />
                        </div>
                      </div>
                      <div className="flex gap-2">
                        {[10, 15, 20].map((pct) => (
                          <button
                            key={pct}
                            onClick={() => {
                              const subtotal =
                                paymentOrder.total +
                                paymentCart.reduce(
                                  (acc, i) => acc + i.price * i.quantity,
                                  0,
                                );
                              setPaymentTip(
                                Number(((subtotal * pct) / 100).toFixed(2)),
                              );
                            }}
                            className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                              paymentTip ===
                              Number(
                                (
                                  ((paymentOrder.total +
                                    paymentCart.reduce(
                                      (acc, i) => acc + i.price * i.quantity,
                                      0,
                                    )) *
                                    pct) /
                                  100
                                ).toFixed(2),
                              )
                                ? "bg-orange-600 text-white border-orange-600"
                                : "bg-white text-slate-400 border-slate-100 hover:border-orange-200"
                            }`}
                          >
                            {pct}%
                          </button>
                        ))}
                        <button
                          onClick={() => {
                            const custom = prompt("Qual o valor da gorjeta?");
                            if (custom && !isNaN(Number(custom))) {
                              setPaymentTip(Number(custom));
                            }
                          }}
                          className={`flex-1 py-2 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all border ${
                            ![10, 15, 20].some(
                              (pct) =>
                                paymentTip ===
                                Number(
                                  (
                                    ((paymentOrder.total +
                                      paymentCart.reduce(
                                        (acc, i) => acc + i.price * i.quantity,
                                        0,
                                      )) *
                                      pct) /
                                    100
                                  ).toFixed(2),
                                ),
                            ) && paymentTip > 0
                              ? "bg-orange-600 text-white border-orange-600"
                              : "bg-white text-slate-400 border-slate-100 hover:border-orange-200"
                          }`}
                        >
                          Personal.
                        </button>
                      </div>
                    </div>

                    <div className="flex justify-between items-center">
                      <span className="text-slate-400 font-bold uppercase text-xs tracking-widest">
                        Total Geral
                      </span>
                      <span className="text-4xl font-black text-slate-900">
                        R${" "}
                        {Math.max(
                          0,
                          paymentOrder.total +
                            paymentCart.reduce(
                              (acc, i) => acc + i.price * i.quantity,
                              0,
                            ) -
                            paymentDiscount +
                            paymentTip,
                        ).toFixed(2)}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="p-8 bg-slate-50 space-y-6">
                  <div>
                    <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">
                      Escolha o Pagamento
                    </h3>
                    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                      {data.paymentMethods.map((m) => (
                        <button
                          key={m.id}
                          onClick={() => setSelectedPaymentMethod(m.name)}
                          className={`p-4 rounded-2xl flex flex-col items-center gap-2 border transition-all group shadow-sm active:scale-95 ${selectedPaymentMethod === m.name ? "bg-orange-600 text-white border-orange-600 shadow-orange-600/30" : "bg-white text-slate-400 border-slate-200 hover:border-orange-500 hover:text-orange-600"}`}
                        >
                          {m.name.toLowerCase().includes("dinheiro") && (
                            <Banknote size={24} />
                          )}
                          {m.name.toLowerCase().includes("cart") && (
                            <CreditCard size={24} />
                          )}
                          {m.name.toLowerCase().includes("pix") && (
                            <Smartphone size={24} />
                          )}
                          {!m.name.toLowerCase().includes("pix") &&
                            !m.name.toLowerCase().includes("dinheiro") &&
                            !m.name.toLowerCase().includes("cart") && (
                              <Plus size={24} />
                            )}
                          <span className="text-[10px] font-black uppercase tracking-widest text-center">
                            {m.name}
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  <button
                    disabled={!selectedPaymentMethod || loading}
                    onClick={() =>
                      confirmFinishOrder(
                        paymentOrder!.id,
                        selectedPaymentMethod!,
                        paymentCart,
                        paymentDiscount,
                        paymentTip,
                      )
                    }
                    className={`w-full py-5 rounded-[2rem] font-black uppercase tracking-widest text-sm shadow-xl transition-all active:scale-95 flex items-center justify-center gap-3 ${!selectedPaymentMethod ? "bg-slate-200 text-slate-400 cursor-not-allowed shadow-none" : "bg-orange-600 text-white shadow-orange-600/40 hover:bg-orange-700"}`}
                  >
                    {loading ? (
                      "Finalizando..."
                    ) : (
                      <>
                        <CheckCircle2 size={24} /> Finalizar Pagamento
                      </>
                    )}
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}

          {showHistoryDetailModal && historyDetailOrder && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-sm"
            >
              <motion.div
                initial={{ scale: 0.9, y: 20 }}
                animate={{ scale: 1, y: 0 }}
                className="bg-white w-full max-w-xl rounded-[2.5rem] shadow-2xl overflow-hidden flex flex-col max-h-[85vh] sm:max-h-[90vh]"
              >
                {/* Header */}
                <div className="p-6 sm:p-8 border-b border-slate-100 flex justify-between items-center bg-white">
                  <div>
                    <h2 className="text-xl sm:text-2xl font-black text-slate-800 flex items-center gap-2">
                       <div className="w-2 h-8 bg-orange-500 rounded-full"></div>
                       Pedido #{historyDetailOrder.id.slice(0, 6)}
                    </h2>
                    <p className="text-slate-400 font-medium text-xs sm:text-sm mt-1">
                      {new Date(historyDetailOrder.createdAt).toLocaleString()} • Mesa {data.tables.find(t => t.id === historyDetailOrder.tableId)?.number || historyDetailOrder.tableId}
                    </p>
                  </div>
                  <button
                    onClick={() => setShowHistoryDetailModal(false)}
                    className="p-3 bg-slate-50 hover:bg-slate-100 rounded-2xl text-slate-400 transition-colors"
                  >
                    <Plus size={24} className="rotate-45" />
                  </button>
                </div>

                {/* Content */}
                <div className="flex-1 overflow-y-auto p-6 sm:p-8 space-y-8 custom-scrollbar text-left">
                  {/* Items Section */}
                  <div>
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="text-[10px] font-black text-slate-400 uppercase tracking-widest flex items-center gap-2">
                        <ShoppingCart size={14} /> Itens do Pedido
                      </h3>
                      <span className="text-[10px] font-bold text-slate-300">
                        {historyDetailOrder.items.length} ITENS
                      </span>
                    </div>
                    <div className="space-y-3">
                      {historyDetailOrder.items.map((item, idx) => (
                        <div
                          key={idx}
                          className="flex justify-between items-center bg-slate-50 p-4 rounded-2xl border border-slate-100 group hover:border-slate-200 transition-all text-left"
                        >
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center font-black text-slate-800 shadow-sm border border-slate-50 group-hover:bg-slate-100 transition-colors">
                              {item.quantity}x
                            </div>
                            <div>
                              <p className="font-bold text-slate-700 leading-tight">
                                {item.name}
                              </p>
                              <p className="text-[10px] text-slate-400 font-medium tracking-wide">
                                UN: R$ {item.price.toFixed(2)}
                              </p>
                            </div>
                          </div>
                          <span className="font-black text-slate-900 bg-white px-3 py-1 rounded-lg border border-slate-100">
                            R$ {(item.price * item.quantity).toFixed(2)}
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Observations Section */}
                  <div className="p-6 bg-orange-50/50 rounded-3xl border border-orange-100/50">
                    <div className="flex items-center gap-2 mb-2">
                      <FileText size={14} className="text-orange-500" />
                      <h3 className="text-[10px] font-black text-orange-400 uppercase tracking-widest">
                        Observações
                      </h3>
                    </div>
                    <p className="text-slate-700 text-sm font-medium leading-relaxed italic">
                      {historyDetailOrder.observations ? `"${historyDetailOrder.observations}"` : "Sem observações adicionais para este pedido."}
                    </p>
                  </div>

                  {/* Footer Stats */}
                  <div className="grid grid-cols-2 gap-4">
                    <div className="p-5 bg-slate-50 rounded-[2rem] border border-slate-100 flex items-center gap-4">
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-400 shadow-sm">
                        <Users size={18} />
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Garçom</p>
                        <p className="font-bold text-slate-700 text-sm truncate max-w-[100px]">{historyDetailOrder.waiterName}</p>
                      </div>
                    </div>
                    <div className="p-5 bg-slate-50 rounded-[2rem] border border-slate-100 flex items-center gap-4">
                      <div className="w-10 h-10 bg-white rounded-xl flex items-center justify-center text-slate-400 shadow-sm">
                        <CreditCard size={18} />
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Pagamento</p>
                        <p className={`font-bold text-sm ${historyDetailOrder.isPaid ? "text-emerald-600" : "text-orange-600"}`}>
                          {historyDetailOrder.isPaid ? historyDetailOrder.paymentMethod || "Pago" : "Pendente"}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Footer Total */}
                <div className="p-8 bg-slate-900 text-white flex items-center justify-between">
                   <div className="text-left">
                      <div className="flex flex-col mb-1 text-slate-500 font-black text-[10px] uppercase tracking-widest leading-tight">
                        {historyDetailOrder.discount ? <span>Desconto: R$ {historyDetailOrder.discount.toFixed(2)}</span> : null}
                        {historyDetailOrder.tip ? <span>Gorjeta: R$ {historyDetailOrder.tip.toFixed(2)}</span> : null}
                        <span>Total Final do Pedido</span>
                      </div>
                      <p className="text-3xl font-black text-white">
                         R$ {historyDetailOrder.total.toFixed(2)}
                      </p>
                   </div>
                   <div className="flex flex-col items-end gap-2">
                     {historyDetailOrder.isPaid ? (
                       <div className="flex items-center gap-2 px-5 py-3 bg-emerald-500/10 text-emerald-400 rounded-2xl font-black text-xs uppercase border border-emerald-500/20">
                          <CheckCircle2 size={18} /> Pago via {historyDetailOrder.paymentMethod}
                       </div>
                     ) : (
                       <button 
                          onClick={(e) => {
                            e.stopPropagation();
                            payOrder(historyDetailOrder.id);
                            setShowHistoryDetailModal(false);
                          }}
                          className="px-8 py-4 bg-orange-600 hover:bg-orange-700 text-white rounded-2xl font-black text-xs uppercase tracking-widest shadow-xl shadow-orange-950/20 transition-all active:scale-95 flex items-center gap-3"
                        >
                          <CheckCircle2 size={20} /> Marcar como Pago
                       </button>
                     )}
                   </div>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </main>

      {/* Navigation Bar (Mobile) */}
      <nav className="fixed bottom-0 left-0 right-0 h-20 bg-white/95 backdrop-blur-xl border-t border-slate-200 px-4 flex items-center justify-around z-30 sm:hidden pb-4">
        <button
          onClick={() => {
            setView("tables");
            setSelectedTable(null);
          }}
          className={`flex-1 flex flex-col items-center gap-0.5 transition-all ${view === "tables" || view === "order" ? "text-orange-600" : "text-slate-400"}`}
        >
          <div
            className={`p-2 rounded-2xl ${view === "tables" || view === "order" ? "bg-orange-600 text-white shadow-lg shadow-orange-600/30" : ""}`}
          >
            <ChefHat size={22} />
          </div>
          <span className="text-[9px] font-black uppercase tracking-tighter">
            Mesa
          </span>
        </button>

        <button
          onClick={() => setView("history")}
          className={`flex-1 flex flex-col items-center gap-0.5 transition-all ${view === "history" ? "text-orange-600" : "text-slate-400"}`}
        >
          <div
            className={`p-2 rounded-2xl ${view === "history" ? "bg-orange-600 text-white shadow-lg shadow-orange-600/30" : ""}`}
          >
            <ClipboardList size={22} />
          </div>
          <span className="text-[9px] font-black uppercase tracking-tighter">
            Pedido
          </span>
        </button>

        <div className="flex-none -mt-10 px-2">
          <button
            className="w-16 h-16 bg-orange-600 text-white rounded-full flex items-center justify-center shadow-xl shadow-orange-600/40 border-4 border-white transition-transform active:scale-95 touch-manipulation"
            onClick={() => {
              if (view === "order") {
                submitOrder();
              } else {
                setView("tables");
              }
            }}
          >
            {view === "order" ? <Printer size={32} /> : <Plus size={32} />}
          </button>
        </div>

        {user?.role === "admin" && (
          <button
            onClick={() => {
                setView("admin");
                setAdminTab("Painel");
            }}
            className={`flex-1 flex flex-col items-center gap-0.5 transition-all ${view === "admin" && adminTab === "Painel" ? "text-orange-600" : "text-slate-400"}`}
          >
            <div
              className={`p-2 rounded-2xl ${view === "admin" && adminTab === "Painel" ? "bg-orange-600 text-white shadow-lg shadow-orange-600/30" : ""}`}
            >
              <TrendingUp size={22} />
            </div>
            <span className="text-[9px] font-black uppercase tracking-tighter">
              Painel
            </span>
          </button>
        )}

        {user?.role === "admin" && (
          <button
            onClick={() => {
                setView("admin");
                setAdminTab("Configurações");
            }}
            className={`flex-1 flex flex-col items-center gap-0.5 transition-all ${view === "admin" && adminTab === "Configurações" ? "text-orange-600" : "text-slate-400"}`}
          >
            <div
              className={`p-2 rounded-2xl ${view === "admin" && adminTab === "Configurações" ? "bg-orange-600 text-white shadow-lg shadow-orange-600/30" : ""}`}
            >
              <User size={22} />
            </div>
            <span className="text-[9px] font-black uppercase tracking-tighter">
              Conta
            </span>
          </button>
        )}
      </nav>

      {/* Printable Comanda (Hidden on UI, shown only on Print) */}
      <div className="printable-comanda font-serif text-black leading-tight text-center">
        <h2 className="text-xl font-bold border-b border-black pb-2 mb-2 uppercase">
          COMANDA DE PRODUÇÃO
        </h2>
        <div className="text-left space-y-1 mb-4 text-xs font-mono">
          <p className="flex justify-between font-bold text-base">
            <span>MESA:</span> <span>{selectedTable?.number}</span>
          </p>
          <p className="flex justify-between">
            <span>Garçom:</span> <span>{user?.name}</span>
          </p>
          <p className="flex justify-between">
            <span>Data:</span> <span>{new Date().toLocaleString()}</span>
          </p>
        </div>
        <div className="border-y border-black py-2 mb-2">
          {cart.map((item, i) => (
            <div key={i} className="flex font-mono text-xs">
              <span className="w-8 font-bold">{item.quantity}x</span>
              <span className="flex-1 text-left uppercase">{item.name}</span>
            </div>
          ))}
        </div>
        {observations && (
          <div className="text-left text-xs mb-4 p-2 border border-black italic font-mono bg-slate-50">
            OBS: {observations}
          </div>
        )}
        <div className="text-[10px] border-t border-black pt-2">
          Meu Pedido - Tecnologia para sua Cozinha
        </div>
      </div>

      <Toaster position="top-center" />
    </div>
  );
}
