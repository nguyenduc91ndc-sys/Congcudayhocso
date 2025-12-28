/**
 * Firebase utilities cho Quản lý Đơn hàng
 */
import { database } from './firebaseConfig';
import { ref, push, set, get, update, onValue } from 'firebase/database';
import { Order, AIVideo } from '../types/videoStoreTypes';

const ORDERS_REF = 'orders';

// Tạo mã đơn hàng ngắn gọn
const generateOrderId = (): string => {
    const timestamp = Date.now().toString().slice(-6);
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `DH${timestamp}${random}`;
};

// Tạo đơn hàng mới
export const createOrder = async (
    userId: string,
    userEmail: string,
    userName: string,
    items: AIVideo[]
): Promise<Order | null> => {
    try {
        const orderId = generateOrderId();
        const totalAmount = items.reduce((sum, item) => sum + item.price, 0);

        const order: Order = {
            id: orderId,
            userId,
            userEmail,
            userName,
            items,
            totalAmount,
            status: 'pending',
            paymentNote: orderId, // Nội dung chuyển khoản = mã đơn
            createdAt: Date.now()
        };

        const ordersRef = ref(database, `${ORDERS_REF}/${orderId}`);
        await set(ordersRef, order);

        return order;
    } catch (error) {
        console.error('Error creating order:', error);
        return null;
    }
};

// Lấy đơn hàng của user
export const getOrdersByUser = async (userId: string): Promise<Order[]> => {
    try {
        const ordersRef = ref(database, ORDERS_REF);
        const snapshot = await get(ordersRef);
        if (snapshot.exists()) {
            const data = snapshot.val();
            return Object.values(data as Record<string, Order>)
                .filter(order => order.userId === userId)
                .sort((a, b) => b.createdAt - a.createdAt);
        }
        return [];
    } catch (error) {
        console.error('Error getting user orders:', error);
        return [];
    }
};

// Admin: Lấy tất cả đơn hàng
export const getAllOrders = async (): Promise<Order[]> => {
    try {
        const ordersRef = ref(database, ORDERS_REF);
        const snapshot = await get(ordersRef);
        if (snapshot.exists()) {
            const data = snapshot.val();
            return Object.values(data as Record<string, Order>)
                .sort((a, b) => b.createdAt - a.createdAt);
        }
        return [];
    } catch (error) {
        console.error('Error getting all orders:', error);
        return [];
    }
};

// Subscribe realtime cho orders (Admin)
export const subscribeToOrders = (callback: (orders: Order[]) => void) => {
    const ordersRef = ref(database, ORDERS_REF);
    return onValue(ordersRef, (snapshot) => {
        if (snapshot.exists()) {
            const data = snapshot.val();
            const orders = Object.values(data as Record<string, Order>)
                .sort((a, b) => b.createdAt - a.createdAt);
            callback(orders);
        } else {
            callback([]);
        }
    });
};

// Admin: Xác nhận đơn hàng
export const confirmOrder = async (orderId: string): Promise<boolean> => {
    try {
        const orderRef = ref(database, `${ORDERS_REF}/${orderId}`);
        await update(orderRef, {
            status: 'confirmed',
            confirmedAt: Date.now()
        });
        return true;
    } catch (error) {
        console.error('Error confirming order:', error);
        return false;
    }
};

// Hủy đơn hàng
export const cancelOrder = async (orderId: string): Promise<boolean> => {
    try {
        const orderRef = ref(database, `${ORDERS_REF}/${orderId}`);
        await update(orderRef, {
            status: 'cancelled'
        });
        return true;
    } catch (error) {
        console.error('Error cancelling order:', error);
        return false;
    }
};
