const express = require('express');
const router = express.Router();
const mongoose = require('mongoose');

// Import all required models
const Order = require('../data/order');
const Bazaar = require('../data/bazaar');
const Shop = require('../data/shops');
const Provider = require('../data/serviceproviders');
const Customer = require('../data/customers');
const TransactionHistory = require('../data/transactionHistory');
const DeliveryPartner = require('../data/deliveryPartner');
const Product = require('../data/product');
const Item = require('../data/item');
const MasterProduct = require('../data/masterProduct');
const KeshanSabhaPost = require('../data/keshanSabhaPost');

// Simple auth middleware for API routes
const checkAdmin = (req, res, next) => {
    // For now we will assume the request is authenticated if the cookie/token is passed
    // We can tighten this up later based on how pasr-admin passes the auth token
    next();
};

router.use(checkAdmin);

// Fetch Data Endpoint
router.get('/data', async (req, res) => {
    try {
        const { tab, filterParam } = req.query;
        let stats = { pending: 0, verified: 0, rejected: 0 };
        let data = [];

        switch (tab) {
            case 'orders': {
                let filterQuery = {};
                if (filterParam === 'today') {
                    const todayStr = new Date().toISOString().split('T')[0];
                    filterQuery.createdAt = {
                        $gte: new Date(`${todayStr}T00:00:00.000Z`),
                        $lt: new Date(`${todayStr}T23:59:59.999Z`)
                    };
                }

                stats.pending = await Order.countDocuments({ ...filterQuery, orderStatus: 'CREATED' });
                stats.verified = await Order.countDocuments({ ...filterQuery, orderStatus: 'COMPLETED' });
                stats.rejected = await Order.countDocuments({ ...filterQuery, orderStatus: 'CANCELLED' });
                
                const orders = await Order.find(filterQuery)
                    .populate('customerId', 'name username')
                    .populate({
                        path: 'shopId',
                        populate: { path: 'owner', select: 'name username' }
                    })
                    .populate('deliveryPartnerId', 'fullName phoneNumber')
                    .populate({
                        path: 'items.itemId',
                        select: 'img productImage'
                    })
                    .sort({ createdAt: -1 })
                    .limit(500)
                    .lean();
                
                data = orders.map(d => {
                    const shop = d.shopId;
                    const shopName = shop ? (shop.shopName || shop.name) : 'Unknown Shop';
                    const shopPhone = shop && shop.owner ? shop.owner.username : 'No Phone';
                    
                    const customerName = d.customerId ? d.customerId.name : 'Guest';
                    const customerPhone = d.customerId ? d.customerId.username : 'No Phone';

                    const partnerName = d.deliveryPartnerId ? d.deliveryPartnerId.fullName : null;
                    const partnerPhone = d.deliveryPartnerId ? d.deliveryPartnerId.phoneNumber : null;

                    let imageUrl = null;
                    if (d.items && d.items.length > 0 && d.items[0].itemId) {
                        const itemDoc = d.items[0].itemId;
                        if (itemDoc.img && itemDoc.img.url) {
                            imageUrl = itemDoc.img.url;
                        } else if (itemDoc.productImage && itemDoc.productImage.length > 0) {
                            imageUrl = itemDoc.productImage[0].url;
                        }
                    }
                    
                    return {
                        id: d._id.toString(),
                        status: d.orderStatus,
                        time: d.createdAt ? new Date(d.createdAt).toLocaleDateString() : 'Recent',
                        title: `${d.items?.length || 0} items from ${shopName}`,
                        shopName,
                        imageUrl,
                        raw: { 
                            ...d, 
                            shopName, 
                            shopPhone,
                            customerName,
                            customerPhone,
                            partnerName,
                            partnerPhone,
                            bazaarName: 'Unknown' 
                        }
                    };
                });
                break;
            }
            case 'bazaars': {
                stats.pending = await Bazaar.countDocuments({ isActive: false });
                stats.verified = await Bazaar.countDocuments({ isActive: true });
                stats.rejected = 0;
                const bazaars = await Bazaar.find({}).sort({ createdAt: -1 }).limit(500).lean();
                data = bazaars.map(d => ({
                    id: d._id.toString(),
                    status: d.isActive ? 'Verified' : 'Pending',
                    time: d.createdAt ? new Date(d.createdAt).toLocaleDateString() : 'Recent',
                    title: d.name || d.bazaarName || 'Unknown Bazaar',
                    imageUrl: (d.images && d.images[0]) ? d.images[0].url : null,
                    raw: d
                }));
                break;
            }
            case 'providers': {
                stats.pending = await Provider.countDocuments({ verified: false });
                stats.verified = await Provider.countDocuments({ verified: true });
                stats.rejected = 0;
                const providers = await Provider.find({}).populate('owner').sort({ createdAt: -1 }).limit(500).lean();
                data = providers.map(d => {
                    let img = null;
                    if (d.personImage && d.personImage.length > 0) img = d.personImage[0].url || d.personImage[0].path;
                    
                    return {
                        id: d._id.toString(),
                        status: d.verified ? 'Verified' : 'Pending',
                        time: d.createdAt ? new Date(d.createdAt).toLocaleDateString() : 'Recent',
                        title: d.company || 'Unknown Provider',
                        imageUrl: img,
                        raw: d
                    };
                });
                break;
            }
            case 'partner-cash': {
                const orders = await Order.find({
                    orderStatus: 'COMPLETED',
                    paymentType: 'COD'
                }).populate('deliveryPartnerId', 'fullName phoneNumber').sort({ createdAt: -1 }).lean();

                const grouped = {};
                orders.forEach(o => {
                    if (!o.deliveryPartnerId) return; 
                    
                    const dateObj = new Date(o.createdAt);
                    const dateStr = dateObj.toLocaleDateString('en-GB'); 
                    const partnerId = o.deliveryPartnerId._id.toString();
                    const key = `${partnerId}_${dateStr}`;
                    
                    if (!grouped[key]) {
                        grouped[key] = {
                            partnerId,
                            partnerName: o.deliveryPartnerId.fullName,
                            partnerPhone: o.deliveryPartnerId.phoneNumber,
                            dateStr,
                            dateObj,
                            totalAmount: 0,
                            remitted: true,
                            orders: []
                        };
                    }
                    
                    grouped[key].orders.push({
                        id: o._id.toString(),
                        orderId: o.orderId || o._id.toString(),
                        amount: o.totalAmount,
                        remitted: o.cashRemittedToAdmin || false
                    });
                    
                    grouped[key].totalAmount += o.totalAmount;
                    if (!o.cashRemittedToAdmin) {
                        grouped[key].remitted = false;
                    }
                });

                data = Object.values(grouped).sort((a, b) => b.dateObj - a.dateObj).map((g) => ({
                    id: `${g.partnerId}_${g.dateStr.replace(/\\//g, '-')}`,
                    status: g.remitted ? 'Verified' : 'Pending', 
                    time: g.dateStr,
                    title: `₹${g.totalAmount} by ${g.partnerName}`,
                    raw: g
                }));
                
                stats.pending = data.filter(d => d.status === 'Pending').length;
                stats.verified = data.filter(d => d.status === 'Verified').length;
                stats.rejected = 0;
                break;
            }
            case 'payouts': {
                stats.pending = await TransactionHistory.countDocuments({ type: 'PAYOUT_TO_SHOP', status: 'PENDING' });
                stats.verified = await TransactionHistory.countDocuments({ type: 'PAYOUT_TO_SHOP', status: 'COMPLETED' });
                stats.rejected = await TransactionHistory.countDocuments({ type: 'PAYOUT_TO_SHOP', status: 'FAILED' });
                const payouts = await TransactionHistory.find({ type: 'PAYOUT_TO_SHOP' }).sort({ createdAt: -1 }).limit(500).lean();
                
                const shopIds = payouts.map(p => p.shop).filter(Boolean);
                const shops = await Shop.find({ _id: { $in: shopIds } }).lean();
                const shopMap = new Map();
                shops.forEach(s => shopMap.set(s._id.toString(), s.shopName || s.name));

                data = payouts.map(d => ({
                    id: d._id.toString(),
                    status: d.status || 'PENDING',
                    time: d.createdAt ? new Date(d.createdAt).toLocaleDateString() : 'Recent',
                    title: `Payout ₹${d.amount} to ${shopMap.get(d.shop?.toString()) || 'Unknown Shop'}`,
                    raw: d
                }));
                break;
            }
            case 'shops': {
                stats.pending = await Shop.countDocuments({ verified: false });
                stats.verified = await Shop.countDocuments({ verified: true });
                stats.rejected = 0;
                const shops = await Shop.find({}).sort({ createdAt: -1 }).limit(500).lean();
                data = shops.map(d => {
                    let img = null;
                    if (d.shopImage && d.shopImage.length > 0) img = d.shopImage[0].url || d.shopImage[0].path;
                    
                    return {
                        id: d._id.toString(),
                        status: d.verified ? 'Verified' : 'Pending',
                        time: d.createdAt ? new Date(d.createdAt).toLocaleDateString() : 'Recent',
                        title: d.shopName || d.name || 'Unknown Shop',
                        imageUrl: img,
                        raw: d
                    };
                });
                break;
            }
            case 'delivery-partners': {
                stats.pending = await DeliveryPartner.countDocuments({ isVerified: false });
                stats.verified = await DeliveryPartner.countDocuments({ isVerified: true });
                stats.rejected = 0;
                const partners = await DeliveryPartner.find({}).sort({ createdAt: -1 }).limit(500).lean();
                data = partners.map(d => ({
                    id: d._id.toString(),
                    status: d.isVerified ? 'Verified' : 'Pending',
                    time: d.createdAt ? new Date(d.createdAt).toLocaleDateString() : 'Recent',
                    title: d.name || 'Unknown Partner',
                    imageUrl: (d.images && d.images[0]) ? d.images[0].url : null,
                    raw: d
                }));
                break;
            }
            case 'products': {
                stats.pending = await Product.countDocuments({ verified: false });
                stats.verified = await Product.countDocuments({ verified: true });
                stats.rejected = 0;
                const products = await Product.find({}).sort({ createdAt: -1 }).limit(500).lean();
                
                const bazaarIds = products.map(p => p.bazaar).filter(Boolean);
                const bazaars = await Bazaar.find({ _id: { $in: bazaarIds } }).lean();
                const bazaarMap = new Map();
                bazaars.forEach(b => bazaarMap.set(b._id.toString(), b.name || b.bazaarName || 'Unknown'));

                data = products.map(d => {
                    let img = null;
                    if (Array.isArray(d.productImage) && d.productImage.length > 0) img = d.productImage[0].url || d.productImage[0].path;
                    else if (d.productImage && typeof d.productImage === 'string') img = d.productImage;
                    
                    const bazaarName = d.bazaar ? (bazaarMap.get(d.bazaar.toString()) || 'Unknown') : 'Not Assigned';
                    
                    return {
                        id: d._id.toString(),
                        status: d.verified ? 'Verified' : 'Pending',
                        time: d.createdAt ? new Date(d.createdAt).toLocaleDateString() : 'Recent',
                        title: d.productName || d.name || 'Unknown Product',
                        bazaarName,
                        imageUrl: img,
                        raw: { ...d, bazaarName, bazaarId: d.bazaar ? d.bazaar.toString() : null }
                    };
                });
                break;
            }
            case 'items': {
                stats.pending = await Item.countDocuments({ verified: false });
                stats.verified = await Item.countDocuments({ verified: true });
                stats.rejected = 0;
                const items = await Item.find({}).sort({ createdAt: -1 }).limit(500).lean();
                
                const shopIds = items.map(i => i.shop).filter(Boolean);
                const shops = await Shop.find({ _id: { $in: shopIds } }).lean();
                const shopMap = new Map();
                shops.forEach(s => shopMap.set(s._id.toString(), { name: s.shopName || 'Unknown', bazaarId: s.bazaar ? s.bazaar.toString() : null }));

                data = items.map(d => {
                    let img = (d.img && d.img.url) ? d.img.url : null;
                    const shopDoc = d.shop ? shopMap.get(d.shop.toString()) : null;
                    const shopName = shopDoc ? shopDoc.name : 'Not Assigned';
                    const bazaarId = shopDoc ? shopDoc.bazaarId : null;
                    
                    return {
                        id: d._id.toString(),
                        status: d.verified ? 'Verified' : 'Pending',
                        time: d.createdAt ? new Date(d.createdAt).toLocaleDateString() : 'Recent',
                        title: d.name || 'Unknown Item',
                        shopName,
                        imageUrl: img,
                        raw: { ...d, shopName, bazaarId }
                    };
                });
                break;
            }
            case 'kisan-sabha': {
                stats.pending = await KeshanSabhaPost.countDocuments({ status: 'Pending' });
                stats.verified = await KeshanSabhaPost.countDocuments({ status: 'Published' });
                stats.rejected = 0;
                const posts = await KeshanSabhaPost.find({}).sort({ createdAt: -1 }).limit(500).lean();
                data = posts.map(d => ({
                    id: d._id.toString(),
                    status: d.status || 'Pending',
                    time: d.createdAt ? new Date(d.createdAt).toLocaleDateString() : 'Recent',
                    title: d.title || 'Untitled Post',
                    raw: d
                }));
                break;
            }
            case 'dashboard': {
                // Simplified dashboard stats
                stats.pending = `₹0.00`;
                stats.verified = `₹0.00`;
                stats.rejected = `0`;
                // Logic omitted for brevity, it will just return 0 for now. Can fully port aggregation pipeline later if needed.
                data = [];
                break;
            }
        }

        res.json({ success: true, stats, requests: data });
    } catch (error) {
        console.error('Admin API Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

router.post('/action', async (req, res) => {
    try {
        const { action, payload } = req.body;
        
        if (action === 'VERIFY' || action === 'REJECT') {
            const isVerified = action === 'VERIFY';
            switch (payload.tab) {
                case 'bazaars':
                    await Bazaar.updateOne({ _id: payload.id }, { $set: { isActive: isVerified } });
                    break;
                case 'providers':
                    await Provider.updateOne({ _id: payload.id }, { $set: { verified: isVerified } });
                    break;
                case 'shops':
                    await Shop.updateOne({ _id: payload.id }, { $set: { verified: isVerified } });
                    break;
                case 'delivery-partners':
                    await DeliveryPartner.updateOne({ _id: payload.id }, { $set: { isVerified } });
                    break;
                case 'products':
                    await Product.updateOne({ _id: payload.id }, { $set: { verified: isVerified } });
                    break;
                case 'items':
                    await Item.updateOne({ _id: payload.id }, { $set: { verified: isVerified } });
                    break;
                case 'kisan-sabha':
                    await KeshanSabhaPost.updateOne({ _id: payload.id }, { $set: { status: isVerified ? 'Published' : 'Rejected' } });
                    break;
                case 'orders':
                    await Order.updateOne({ _id: payload.id }, { $set: { orderStatus: isVerified ? 'COMPLETED' : 'CANCELLED' } });
                    break;
                case 'payouts':
                    await TransactionHistory.updateOne({ _id: payload.id }, { $set: { status: isVerified ? 'COMPLETED' : 'FAILED' } });
                    break;
            }
        } else if (action === 'DELETE') {
            switch (payload.tab) {
                case 'bazaars': await Bazaar.deleteOne({ _id: payload.id }); break;
                case 'providers': await Provider.deleteOne({ _id: payload.id }); break;
                case 'shops': await Shop.deleteOne({ _id: payload.id }); break;
                case 'delivery-partners': await DeliveryPartner.deleteOne({ _id: payload.id }); break;
                case 'products': await Product.deleteOne({ _id: payload.id }); break;
                case 'items': await Item.deleteOne({ _id: payload.id }); break;
                case 'kisan-sabha': await KeshanSabhaPost.deleteOne({ _id: payload.id }); break;
                case 'orders': await Order.deleteOne({ _id: payload.id }); break;
            }
        } else if (action === 'ASSIGN_BAZAAR') {
            const Model = payload.type === 'shops' ? Shop : Provider;
            await Model.updateOne(
                { _id: payload.entityId },
                { $set: { bazaar: payload.bazaarId, verified: true, isVerified: true } }
            );
        } else if (action === 'ASSIGN_DELIVERY_CATEGORY') {
            const Model = payload.collection === 'products' ? Product : Item;
            await Model.updateOne(
                { _id: payload.id },
                { $set: { deliveryCategory: payload.category, isVerified: true, verified: true } }
            );
        } else if (action === 'UPDATE_PRICE') {
            const Model = payload.collectionName === 'products' ? Product : Item;
            await Model.updateOne(
                { _id: payload.id },
                { $set: { price: Number(payload.newPrice) } }
            );
        } else if (action === 'MARK_REMITTED') {
            const [partnerId, dateStr] = payload.id.split('_'); // 'partnerId_DD-MM-YYYY'
            const [day, month, year] = dateStr.split('-');
            const startOfDay = new Date(`${year}-${month}-${day}T00:00:00.000Z`);
            const endOfDay = new Date(`${year}-${month}-${day}T23:59:59.999Z`);
            
            await Order.updateMany(
                { 
                    deliveryPartnerId: partnerId,
                    orderStatus: 'COMPLETED',
                    paymentType: 'COD',
                    createdAt: { $gte: startOfDay, $lte: endOfDay }
                },
                { $set: { cashRemittedToAdmin: true } }
            );
        }

        res.json({ success: true, message: 'Action executed successfully' });
    } catch (error) {
        console.error('Admin API Action Error:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

router.get('/bazaars/active', async (req, res) => {
    try {
        const bazaars = await Bazaar.find({ isActive: true }).sort({ name: 1 }).lean();
        res.json({ success: true, bazaars: bazaars.map(b => ({ id: b._id, name: b.name || b.bazaarName })) });
    } catch (error) {
        res.status(500).json({ success: false, message: error.message });
    }
});

module.exports = router;
