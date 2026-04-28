import express from 'express';
import { createServer as createViteServer } from 'vite';
import path from 'path';
import { fileURLToPath } from 'url';
import fs from 'fs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const DATA_FILE = path.join(__dirname, 'data.json');
const JWT_SECRET = process.env.JWT_SECRET || 'restaurant-secret-key';

// Initial data structure
const initialData = {
  users: [
    { id: '1', name: 'Rafael', username: 'rafael', password: '123', role: 'admin' },
    { id: 'rafael_email', name: 'Rafael Santos', username: 'rafaelsantos458@gmail.com', password: '123', role: 'admin' },
    { id: 'admin', name: 'Administrador', username: 'admin', password: '123', role: 'admin' },
    { id: '2', name: 'Garçom João', username: 'joao', password: '123', role: 'waiter' }
  ],
  categories: [
    { id: '1', name: 'Bebidas' },
    { id: '2', name: 'Pratos Principais' },
    { id: '3', name: 'Sobremesas' },
    { id: 'extras', name: 'Extras (Balas/Doces)' }
  ],
  products: [],
  tables: [
    { id: '1', number: '01', status: 'available' },
    { id: '2', number: '02', status: 'available' },
    { id: '3', number: '03', status: 'available' },
    { id: '4', number: '04', status: 'available' },
    { id: '5', number: '05', status: 'available' },
    { id: '6', number: '06', status: 'available' },
    { id: '7', number: '07', status: 'available' },
    { id: '8', number: '08', status: 'available' },
    { id: '9', number: '09', status: 'available' },
    { id: '10', number: '10', status: 'available' },
    { id: '11', number: '11', status: 'available' },
    { id: '12', number: '12', status: 'available' },
    { id: '13', number: '13', status: 'available' },
    { id: '14', number: '14', status: 'available' },
    { id: '15', number: '15', status: 'available' },
    { id: '16', number: '16', status: 'available' },
    { id: '17', number: '17', status: 'available' },
    { id: '18', number: '18', status: 'available' },
    { id: '19', number: '19', status: 'available' },
    { id: '20', number: '20', status: 'available' }
  ],
  paymentMethods: [
    { id: '1', name: 'Dinheiro' },
    { id: '2', name: 'Cartão de Crédito' },
    { id: '3', name: 'Cartão de Débito' },
    { id: '4', name: 'PIX' }
  ],
  cashRegister: {
    isOpen: false,
    openedAt: null,
    openedBy: null,
    initialValue: 0,
    history: []
  },
  orders: [],
  config: {
    stockThreshold: 5
  }
};

function loadData() {
  if (!fs.existsSync(DATA_FILE)) {
    fs.writeFileSync(DATA_FILE, JSON.stringify(initialData, null, 2));
    return initialData;
  }
  try {
    const data = JSON.parse(fs.readFileSync(DATA_FILE, 'utf-8'));
    
    // Robust initialization with defaults
    data.users = data.users || initialData.users;
    data.categories = data.categories || initialData.categories;
    data.products = data.products || initialData.products;
    data.tables = data.tables || initialData.tables;
    data.paymentMethods = data.paymentMethods || initialData.paymentMethods;
    data.orders = data.orders || initialData.orders;
    data.config = data.config || initialData.config;
    
    if (!data.cashRegister) {
      data.cashRegister = { ...initialData.cashRegister };
    } else {
      data.cashRegister.isOpen = data.cashRegister.isOpen ?? initialData.cashRegister.isOpen;
      data.cashRegister.openedAt = data.cashRegister.openedAt ?? initialData.cashRegister.openedAt;
      data.cashRegister.openedBy = data.cashRegister.openedBy ?? initialData.cashRegister.openedBy;
      data.cashRegister.initialValue = data.cashRegister.initialValue ?? initialData.cashRegister.initialValue;
      data.cashRegister.history = data.cashRegister.history ?? initialData.cashRegister.history;
    }
    return data;
  } catch (err) {
    console.error('Error loading data, reverting to initial:', err);
    return initialData;
  }
}

function saveData(data: any) {
  fs.writeFileSync(DATA_FILE, JSON.stringify(data, null, 2));
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes
  app.post('/api/login', (req, res) => {
    const { username, password } = req.body;
    const data = loadData();
    const user = data.users.find((u: any) => u.username === username && u.password === password);

    if (user) {
      const token = jwt.sign({ id: user.id, username: user.username, role: user.role, name: user.name }, JWT_SECRET);
      res.json({ token, user: { id: user.id, name: user.name, role: user.role } });
    } else {
      res.status(401).json({ message: 'Credenciais inválidas' });
    }
  });

  // Middleware to verify JWT
  const authenticate = (req: any, res: any, next: any) => {
    const token = req.headers['authorization']?.split(' ')[1];
    if (!token) return res.status(401).json({ message: 'Não autorizado' });

    jwt.verify(token, JWT_SECRET, (err: any, decoded: any) => {
      if (err) return res.status(401).json({ message: 'Sessão expirada' });
      req.user = decoded;
      next();
    });
  };

  app.get('/api/data', authenticate, (req, res) => {
    res.json(loadData());
  });

  app.post('/api/orders', authenticate, (req: any, res) => {
    const { tableId, items, total, observations } = req.body;
    const data = loadData();
    
    // Decrement stock for each item
    for (const item of items) {
      const product = data.products.find((p: any) => p.id === item.productId);
      if (product && (product.categoryId === '1' || product.categoryId === 'bebidas')) {
        product.stock = Math.max(0, (product.stock || 0) - (item.quantity || 1));
      }
    }

    const newOrder = {
      id: uuidv4(),
      tableId,
      waiterId: req.user.id,
      waiterName: req.user.name,
      items,
      total,
      observations,
      status: 'pending',
      isPaid: false,
      createdAt: new Date().toISOString()
    };

    data.orders.push(newOrder);
    
    // Update table status
    const table = data.tables.find((t: any) => t.id === tableId);
    if (table) table.status = 'occupied';

    saveData(data);
    res.status(201).json(newOrder);
  });

  app.put('/api/admin/config', authenticate, (req: any, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Proibido' });
    const { stockThreshold } = req.body;
    const data = loadData();
    data.config = { ...data.config, stockThreshold: Number(stockThreshold) };
    saveData(data);
    res.json(data.config);
  });

  app.post('/api/orders/:id/finish', authenticate, (req, res) => {
    const { paymentMethod, extraItems, discount, tip } = req.body;
    const data = loadData();
    const order = data.orders.find((o: any) => o.id === req.params.id);
    if (order) {
      // Add extra items if any
      if (extraItems && extraItems.length > 0) {
        order.items = [...order.items, ...extraItems];
        order.total += extraItems.reduce((acc: number, i: any) => acc + (i.price * i.quantity), 0);
        
        // Decrement stock for extra items
        for (const item of extraItems) {
          const product = data.products.find((p: any) => p.id === item.productId);
          if (product && (product.categoryId === '1' || product.categoryId === 'bebidas')) {
            product.stock = Math.max(0, (product.stock || 0) - (item.quantity || 1));
          }
        }
      }

      // Apply discount and tip
      order.discount = Number(discount) || 0;
      order.tip = Number(tip) || 0;
      order.total = Math.max(0, order.total - order.discount + order.tip);

      order.status = 'finished';
      order.isPaid = true;
      order.finishedAt = new Date().toISOString();
      order.paymentMethod = paymentMethod;
      const table = data.tables.find((t: any) => t.id === order.tableId);
      if (table) {
        // Check if there are other pending orders for this table
        const otherOrders = data.orders.filter((o: any) => o.tableId === order.tableId && o.status === 'pending');
        if (otherOrders.length === 0) {
          table.status = 'available';
        }
      }
      saveData(data);
      res.json(order);
    } else {
      res.status(404).json({ message: 'Pedido não encontrado' });
    }
  });

  app.post('/api/orders/:id/pay', authenticate, (req, res) => {
    const { paymentMethod } = req.body;
    const data = loadData();
    const order = data.orders.find((o: any) => o.id === req.params.id);
    if (order) {
      order.isPaid = true;
      order.paymentMethod = paymentMethod;
      saveData(data);
      res.json(order);
    } else {
      res.status(404).json({ message: 'Pedido não encontrado' });
    }
  });

  // Admin: User management
  app.get('/api/admin/users', authenticate, (req: any, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Proibido' });
    const data = loadData();
    // Remove passwords before sending to client
    const safeUsers = data.users.map(({ password, ...u }: any) => u);
    res.json(safeUsers);
  });

  app.post('/api/admin/users', authenticate, (req: any, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Proibido' });
    const { name, username, password, role } = req.body;
    const data = loadData();
    const newUser = { id: uuidv4(), name, username, password, role };
    data.users.push(newUser);
    saveData(data);
    res.status(201).json(newUser);
  });

  // Admin: Product management
  app.post('/api/admin/products', authenticate, (req: any, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Proibido' });
    const { name, price, categoryId, stock } = req.body;
    const data = loadData();
    const newProduct = { 
      id: uuidv4(), 
      name, 
      price: Number(price), 
      categoryId,
      stock: Number(stock) || 0 
    };
    data.products.push(newProduct);
    saveData(data);
    res.status(201).json(newProduct);
  });

  app.put('/api/admin/products/:id', authenticate, (req: any, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Proibido' });
    const { name, price, categoryId, stock } = req.body;
    const data = loadData();
    const product = data.products.find((p: any) => p.id === req.params.id);
    if (product) {
      if (name !== undefined) product.name = name;
      if (price !== undefined) product.price = Number(price);
      if (categoryId !== undefined) product.categoryId = categoryId;
      if (stock !== undefined) product.stock = Number(stock);
      saveData(data);
      res.json(product);
    } else {
      res.status(404).json({ message: 'Produto não encontrado' });
    }
  });

  app.delete('/api/admin/products/:id', authenticate, (req: any, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Proibido' });
    const data = loadData();
    data.products = data.products.filter((p: any) => p.id !== req.params.id);
    saveData(data);
    res.json({ message: 'Produto removido' });
  });
  
  // Admin: Payment method management
  app.post('/api/admin/payment-methods', authenticate, (req: any, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Proibido' });
    const { name } = req.body;
    const data = loadData();
    const newMethod = { id: uuidv4(), name };
    data.paymentMethods.push(newMethod);
    saveData(data);
    res.status(201).json(newMethod);
  });

  // Admin: Table management
  app.post('/api/admin/tables', authenticate, (req: any, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Proibido' });
    const { number } = req.body;
    const data = loadData();
    const newTable = { id: uuidv4(), number, status: 'available' };
    data.tables.push(newTable);
    saveData(data);
    res.status(201).json(newTable);
  });

  app.delete('/api/admin/tables/:id', authenticate, (req: any, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Proibido' });
    const data = loadData();
    data.tables = data.tables.filter((t: any) => t.id !== req.params.id);
    saveData(data);
    res.json({ message: 'Mesa removida' });
  });

  // Cash Register Management
  app.post('/api/admin/cash/open', authenticate, (req: any, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Proibido' });
    const { initialValue } = req.body;
    const data = loadData();
    
    if (data.cashRegister.isOpen) return res.status(400).json({ message: 'Caixa já está aberto' });

    data.cashRegister = {
      ...data.cashRegister,
      isOpen: true,
      openedAt: new Date().toISOString(),
      openedBy: req.user.name,
      initialValue: Number(initialValue)
    };

    saveData(data);
    res.json(data.cashRegister);
  });

  app.post('/api/admin/cash/close', authenticate, (req: any, res) => {
    if (req.user.role !== 'admin') return res.status(403).json({ message: 'Proibido' });
    const data = loadData();
    
    if (!data.cashRegister.isOpen) return res.status(400).json({ message: 'Caixa já está fechado' });

    const ordersInPeriod = data.orders.filter((o: any) => 
      o.status === 'finished' && 
      o.isPaid && 
      o.finishedAt &&
      o.finishedAt >= data.cashRegister.openedAt
    );

    const totalSales = ordersInPeriod.reduce((acc: number, o: any) => acc + o.total, 0);

    const record = {
      openedAt: data.cashRegister.openedAt,
      closedAt: new Date().toISOString(),
      openedBy: data.cashRegister.openedBy,
      initialValue: data.cashRegister.initialValue,
      totalSales: totalSales,
      ordersCount: ordersInPeriod.length
    };

    if (!data.cashRegister.history) data.cashRegister.history = [];
    data.cashRegister.history.push(record);
    data.cashRegister.isOpen = false;
    data.cashRegister.openedAt = null;

    saveData(data);
    res.json(record);
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
