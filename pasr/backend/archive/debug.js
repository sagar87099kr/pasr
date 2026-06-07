 layout('./layoutes/boilerplate.ejs') 
 -JSON.stringify(shop) 
 const SHOP_CATEGORIES={ "Electronics" : [ { name: "Wiring & Cables" , icon: "🔌" }, {
        name: "Switches & Switchgear" , icon: "🎚️" }, { name: "Distribution Panels" , icon: "⚡" }, { name: "Lighting" ,
        icon: "💡" }, { name: "Fans" , icon: "💨" }, { name: "Installation Material" , icon: "🛠️" }, {
        name: "Sockets & Plugs" , icon: "🔌" }, { name: "Inverters & Batteries" , icon: "🔋" }, { name: "Pumps & Motors"
        , icon: "🌊" }, { name: "Tools & Testing" , icon: "🧰" }, { name: "Smart & Security" , icon: "🔒" }, {
        name: "General" , icon: "📦" } ], "Grocery" : [ { name: "Staples & Grains" , icon: "🌾" }, {
        name: "Edible Oil & Ghee" , icon: "🛢️" }, { name: "Spices & Masala" , icon: "🌶️" }, { name: "Snacks & Namkeen"
        , icon: "🥨" }, { name: "Beverages" , icon: "🥤" }, { name: "Dairy & Refrigerator" , icon: "🥛" }, {
        name: "Bakery Items" , icon: "🍞" }, { name: "Personal Care" , icon: "🧴" }, { name: "Home Cleaning & Household"
        , icon: "🧹" }, { name: "Baby Care" , icon: "👶" }, { name: "Dry Fruits & Sweets" , icon: "🥜" }, {
        name: "Instant & Ready to Eat" , icon: "🍜" }, { name: "General" , icon: "📦" } ], "Fashion" : [ {
        name: "Men's Wear" , icon: "👕" }, { name: "Women's Wear" , icon: "👗" }, { name: "Kids Wear" , icon: "👶" }, {
        name: "Ethnic Wear" , icon: "👘" }, { name: "Winter Wear" , icon: "🧥" }, { name: "Sports & Activewear" ,
        icon: "🏃" }, { name: "Innerwear & Lingerie" , icon: "🩲" }, { name: "Accessories" , icon: "👜" }, {
        name: "General" , icon: "📦" } ], "General Store" : [ { name: "Daily Essentials" , icon: "🧼" }, {
        name: "Snacks & Namkeen" , icon: "🥨" }, { name: "Personal Care" , icon: "🧴" }, { name: "Household Items" ,
        icon: "🏠" }, { name: "Stationery" , icon: "✏️" }, { name: "Cleaning Supplies" , icon: "🧹" }, {
        name: "Baby Care" , icon: "👶" }, { name: "General" , icon: "📦" } ], "Footwear" : [ { name: "Men's Footwear" ,
        icon: "👞" }, { name: "Women's Footwear" , icon: "👠" }, { name: "Kids' Footwear" , icon: "👟" }, {
        name: "Sports & Active Footwear" , icon: "🏃" }, { name: "Seasonal Footwear" , icon: "👢" }, {
        name: "Premium / Branded" , icon: "🏷️" }, { name: "Footwear Accessories" , icon: "🧦" }, { name: "General" ,
        icon: "📦" } ], "Automobile" : [ { name: "Parts & Accessories" , icon: "🔧" }, { name: "Oils & Lubricants" ,
        icon: "🛢️" }, { name: "Batteries" , icon: "🔋" }, { name: "Tires & Wheels" , icon: "⚙️" }, {
        name: "Car Care & Cleaning" , icon: "✨" }, { name: "Tools & Equipment" , icon: "🧰" }, { name: "General" ,
        icon: "📦" } ], "Bakery" : [ { name: "Breads" , icon: "🍞" }, { name: "Cakes & Pastries" , icon: "🎂" }, {
        name: "Cookies & Biscuits" , icon: "🍪" }, { name: "Sweets & Desserts" , icon: "🍰" }, { name: "Savory Items" ,
        icon: "🥐" }, { name: "Custom Orders" , icon: "📝" }, { name: "General" , icon: "📦" } ], "Dhaba" : [ {
        name: "Veg Dishes" , icon: "🥗" }, { name: "Non-Veg Dishes" , icon: "🍗" }, { name: "Rice & Roti" , icon: "🍚"
        }, { name: "Snacks & Starters" , icon: "🍟" }, { name: "Beverages" , icon: "🥤" }, { name: "Combo Meals" ,
        icon: "🍱" }, { name: "General" , icon: "📦" } ], "Furniture" : [ { name: "Beds & Mattresses" , icon: "🛏️" }, {
        name: "Sofas & Chairs" , icon: "🛋️" }, { name: "Tables & Desks" , icon: "🪑" }, { name: "Storage & Cabinets" ,
        icon: "🗄️" }, { name: "Home Decor" , icon: "🖼️" }, { name: "Office Furniture" , icon: "💼" }, {
        name: "General" , icon: "📦" } ], "Hardware" : [ { name: "Tools & Equipment" , icon: "🔨" }, {
        name: "Building Materials" , icon: "🧱" }, { name: "Paint & Supplies" , icon: "🎨" }, { name: "Plumbing" ,
        icon: "🚰" }, { name: "Electrical Items" , icon: "💡" }, { name: "Locks & Security" , icon: "🔒" }, {
        name: "General" , icon: "📦" } ], "Jewelers" : [ { name: "Gold Jewelry" , icon: "💛" }, { name: "Silver Jewelry"
        , icon: "🤍" }, { name: "Diamond Jewelry" , icon: "💎" }, { name: "Imitation / Fashion" , icon: "✨" }, {
        name: "Bridal Jewelry" , icon: "👰" }, { name: "Repairs & Custom" , icon: "🔧" }, { name: "General" , icon: "📦"
        } ], "Medical" : [ { name: "Medicines" , icon: "💊" }, { name: "Health Supplements" , icon: "💪" }, {
        name: "Medical Devices" , icon: "🩺" }, { name: "First Aid" , icon: "🩹" }, { name: "Baby Care" , icon: "👶" },
        { name: "Personal Care" , icon: "🧴" }, { name: "General" , icon: "📦" } ], "Mobile Shop" : [ {
        name: "Smartphones" , icon: "📱" }, { name: "Feature Phones" , icon: "📞" }, { name: "Accessories" , icon: "🎧"
        }, { name: "Chargers & Cables" , icon: "🔌" }, { name: "Cases & Covers" , icon: "📲" }, {
        name: "Repairs & Services" , icon: "🔧" }, { name: "General" , icon: "📦" } ], "Non-Veg" : [ { name: "Chicken" ,
        icon: "🍗" }, { name: "Mutton" , icon: "🍖" }, { name: "Fish" , icon: "🐟" }, { name: "Eggs" , icon: "🥚" }, {
        name: "Seafood" , icon: "🦐" }, { name: "Frozen Items" , icon: "❄️" }, { name: "General" , icon: "📦" }
        ], "Printing & Digital" : [ { name: "Printing Services" , icon: "🖨️" }, { name: "Photocopying" , icon: "📄" },
        { name: "Scanning" , icon: "📷" }, { name: "Lamination" , icon: "🧾" }, { name: "Binding" , icon: "📚" }, {
        name: "Design Services" , icon: "🎨" }, { name: "General" , icon: "📦" } ], "Restaurant" : [ {
        name: "Veg Dishes" , icon: "🥗" }, { name: "Non-Veg Dishes" , icon: "🍗" }, { name: "Chinese" , icon: "🥡" }, {
        name: "South Indian" , icon: "🥘" }, { name: "Beverages" , icon: "🥤" }, { name: "Desserts" , icon: "🍨" }, {
        name: "General" , icon: "📦" } ], "Salon" : [ { name: "Haircut & Styling" , icon: "✂️" }, { name: "Hair Color" ,
        icon: "🎨" }, { name: "Facial & Cleanup" , icon: "💆" }, { name: "Spa & Massage" , icon: "💅" }, {
        name: "Bridal Services" , icon: "👰" }, { name: "Men's Grooming" , icon: "🧔" }, { name: "General" , icon: "📦"
        } ], "Seeds & Fertilizers" : [ { name: "Seeds" , icon: "🌱" }, { name: "Chemical Fertilizers" , icon: "🧪" }, {
        name: "Organic Fertilizers" , icon: "♻️" }, { name: "Pesticides" , icon: "🦟" }, { name: "Farming Tools" ,
        icon: "🚜" }, { name: "Plant Care" , icon: "🌿" }, { name: "General" , icon: "📦" } ], "Sports" : [ {
        name: "Cricket" , icon: "🏏" }, { name: "Football" , icon: "⚽" }, { name: "Badminton" , icon: "🏸" }, {
        name: "Gym Equipment" , icon: "🏋️" }, { name: "Sportswear" , icon: "🎽" }, { name: "Indoor Games" , icon: "♟️"
        }, { name: "Trophies & Medals" , icon: "🏆" }, { name: "General" , icon: "📦" } ], "Stationery" : [ {
        name: "Writing Supplies" , icon: "✏️" }, { name: "Notebooks & Diaries" , icon: "📓" }, { name: "Art & Craft" ,
        icon: "🎨" }, { name: "Office Supplies" , icon: "📎" }, { name: "School Items" , icon: "🎒" }, {
        name: "Printing Paper" , icon: "📄" }, { name: "General" , icon: "📦" } ], "Vegetables & Fruits" : [ {
        name: "Fresh Vegetables" , icon: "🥦" }, { name: "Fresh Fruits" , icon: "🍎" }, { name: "Seasonal Items" ,
        icon: "🌽" }, { name: "Exotic" , icon: "🥝" }, { name: "Organic" , icon: "🌿" }, { name: "Herbs" , icon: "🌿" },
        { name: "General" , icon: "📦" } ], "Beauty/Cosmetics" : [ { name: "Makeup" , icon: "💄" }, { name: "Skincare" ,
        icon: "🧴" }, { name: "Haircare" , icon: "💇‍♀️" }, { name: "Fragrance" , icon: "🌺" }, { name: "Personal Care"
        , icon: "🛁" }, { name: "Tools & Accessories" , icon: "💅" }, { name: "General" , icon: "📦" } ], "Coaching" : [
        { name: "Tuition (School)" , icon: "📚" }, { name: "Competitive Exams" , icon: "📝" }, {
        name: "Language Classes" , icon: "🗣️" }, { name: "Arts & Hobbies" , icon: "🎨" }, { name: "Sports Coaching" ,
        icon: "⚽" }, { name: "Professional Skills" , icon: "💻" }, { name: "General" , icon: "📦" } ] }; function
        getShopCategoryData(shopCategory) { if (!shopCategory) return null; const
        key=Object.keys(SHOP_CATEGORIES).find(function(k) { return k.toLowerCase()===shopCategory.toLowerCase(); });
        return key ? SHOP_CATEGORIES[key] : null; } const currentShopCats=getShopCategoryData(shop.category); 
 if(shop.shopImage && shop.shopImage.length> 0) { 
 optimizeImage(shop.shopImage[0].url) 
 shop.shopName 
 } else { 
 } 
 shop.shopName 
 /* Compute current open/closed status */ let shopIsCurrentlyOpen=false; if (shop.isActive
                                && !shop.isHoliday) { if (shop.openingTime && shop.closingTime) { const now=new Date();
                                const [oh, om]=shop.openingTime.split(':').map(Number); const [ch,
                                cm]=shop.closingTime.split(':').map(Number); const nowMin=now.getHours() * 60 +
                                now.getMinutes(); const openMin=oh * 60 + om; const closeMin=ch * 60 + cm;
                                shopIsCurrentlyOpen=nowMin>= openMin && nowMin < closeMin; } else {
                                    shopIsCurrentlyOpen=true; // No hours set=always open if active } } 
 if (shop.isHoliday) { 
 } else if (shopIsCurrentlyOpen) { 
 if (shop.closingTime) { 
 shop.closingTime 
 } 
 } else { 
 if (shop.openingTime && !shop.isHoliday) { 

                                                            shop.openingTime 
 } 
 } 
 if(currentShopCats && currentShopCats.length> 0) { 
 } 
 shop.location || "Location not available" 
 shop.owner.name 
 shop.owner.username 
 shop.owner.username 
 shop.shopDescription || "No description provided."
                                                                    
 if (currUser && shop.owner._id.equals(currUser._id)) { 
 if (typeof activeOrderCount !=='undefined' &&
                                                                    activeOrderCount> 0) { 
 } 
 shop._id 
 shop.isActive ? 'Open' : 'Closed' 
shop.isActive ? 'checked' : '' 
 shop.isHoliday ? 'Yes' : 'No' 
shop.isHoliday ? 'checked' : '' 
 } 
 if (currUser && shop.owner._id.equals(currUser._id)) { 
 parseFloat(totalPendingPayout
                                                                                        || 0).toFixed(2) 
 parseFloat(totalDueToPasr ||
                                                                                        0).toFixed(2) 
 if (totalRequestedPayout> 0) { 
 parseFloat(totalRequestedPayout).toFixed(2)
                                                                                        
 } 
(totalPendingPayout || 0) <=0
                                                                            ? 'disabled' : '' 
(totalDueToPasr || 0) <=0 ? 'disabled'
                                                                            : '' 
 shop.upiId ? shop.upiId
                                                                                : 'UPI ID Not Set' 
 shop._id 
 shop._id 
 totalPendingPayout || 0 
 shop._id 
 totalDueToPasr || 0 
 if (!shop.upiId) { 
 } 
 parseFloat(totalPendingPayout || 0).toFixed(2) 
 } 
 if (currUser && shop.owner._id.equals(currUser._id)) { 
 } 
 let categoriesToDisplay=[]; const isOwnerView=currUser &&
                            shop.owner._id.equals(currUser._id); if (!isOwnerView && typeof availableCategories
                            !=='undefined' ) { // Customer view: only show categories with in-stock items const
                            masterCats=getShopCategoryData(shop.category) || [];
                            categoriesToDisplay=availableCategories.map(catName=> {
                            const found = masterCats.find(c => c.name === catName);
                            return found || { name: catName, icon: "📦" };
                            }).sort((a,b) => a.name.localeCompare(b.name));
                            } else if (currentShopCats) {
                            // Owner view: show all possible categories for setup
                            categoriesToDisplay = currentShopCats;
                            }
                            
 if(categoriesToDisplay && categoriesToDisplay.length> 0) { 
 categoriesToDisplay.forEach(cat=> { 
 cat.name 
 cat.icon 
 cat.name 
 }) 
 } 
 if (typeof displayItems !=='undefined' && displayItems.length> 0) { 
 displayItems.forEach(item=> { 
 const product=item.product || item; const itemName=product.name ||
                                                    item.name; const itemImg=(product.img && product.img.url) ?
                                                    product.img.url : (item.img && item.img.url ? item.img.url : '' );
                                                    const itemDesc=product.description || item.description || '' ; const
                                                    itemCat=product.category || item.itemCategory || 'General' ; 
 (item.quantity === 0) ? 'virtual-item' : '' 
 (itemCat === 'Other' || itemCat === 'Others' || !itemCat) ? 'General' : itemCat 
 itemName 
 itemImg 
 item.price 
 item.quantity 
 item._id || '' 
 product._id || '' 
 shop._id 
 shop.shopName 
 shop.owner.username 
 itemDesc 
 item.isVirtual 
 (item.quantity === 0) ? 'opacity: 0.7; border-style: dashed;' : '' 
 if(itemImg) { 
 itemImg 
 itemName 
 } else { 
 } 
 item.price 
 if(item.quantity===0) { 
 } 
 itemName 
 item.quantity 
 if ((shop.category==='Footwear' ||
                                                                shop.category==='Fashion' ) && item.sizes &&
                                                                item.sizes.length> 0) { 
 item.sizes.forEach(function(sz){ 
 sz.replace('Kids-Infant-','').replace('Kids-Junior-','').replace('Infant-','').replace('Kids-','').replace('Women-','').replace('Men-','')
                                                                                
 }); 
 } 
 if (currUser &&
                                                                        shop.owner._id.equals(currUser._id)) { 
 shop._id 
 item._id 
 } 
 }) 
 } else { 
 } 
 if (shop.shopImage && shop.shopImage.length> 1) { 
 shop.shopImage.forEach((image, index)=> { 
 optimizeImage(image.url) 
 }) 
 } 
 shop._id 
 if(shop.reviews && shop.reviews.length> 0) { 
 for (let review of shop.reviews){ 
 review.author.name.charAt(0).toUpperCase() 
 review.author.name 
 review.createdAt ? review.createdAt.toDateString()
                                                                    : '' 
 for(let i=0; i<review.ratings; i++) { 
 } 

                                                                        review.ratings 
 review.comment 
 if(currUser && review.author._id.equals(currUser._id)) { 
 shop._id 
 review._id 
 } 
 } 
 } else { 
 } 
 shop._id 
 if(currentShopCats) { 
 currentShopCats.forEach(cat=> { 
 cat.name 
 cat.icon 
 cat.name 
 }) 
 } 
 if(shop.category==='Footwear' ) { 
 ['1','2','3','4','5','6','7','8','9'].forEach(function(s){ 
 s 
 s 
 s 
 s 
 }); 
 ['10','11','12','13','1j','2j','3j'].forEach(function(s){ var
                                                    label=s.endsWith('j') ? 'UK ' +s.replace('j','') : 'UK ' +s; var
                                                    id=s; 
 id 
 id 
 id 
 label 
 }); 
 ['3','4','5','6','7','8'].forEach(function(s){ 
 s 
 s.replace('.','_') 
 s.replace('.','_') 
 s 
 }); 
 ['6','7','8','9','10','11','12'].forEach(function(s){ 
 s 
 s.replace('.','_') 
 s.replace('.','_') 
 s 
 }); 
 } 
 if(shop.category==='Fashion' ) { 
 ['0-3M','3-6M','6-9M','9-12M','12-18M','18-24M'].forEach(function(s){
                                                            
 s 
 s.replace('-','_') 
 s.replace('-','_') 
 s 
 }); 
 ['2-3Y','3-4Y','4-5Y','5-6Y','6-7Y','7-8Y','8-9Y','9-10Y','10-11Y','11-12Y','12-13Y','13-14Y','14-15Y'].forEach(function(s){
                                                            
 s 
 s.replace('-','_') 
 s.replace('-','_') 
 s 
 }); 
 ['XS','S','M','L','XL','XXL','XXXL'].forEach(function(s){ 
 s 
 s 
 s 
 s 
 }); 
 ['XS','S','M','L','XL','XXL','XXXL'].forEach(function(s){ 
 s 
 s 
 s 
 s 
 }); 
 } 
 if(currentShopCats) { 
 currentShopCats.forEach(cat=> { 
 cat.name 
 cat.icon 
 cat.name 
 }) 
 } 
 if(shop.category==='Footwear' ) { 
 ['1','2','3','4','5','6','7','8','9'].forEach(function(s){ 
 s 
 s 
 s 
 s 
 }); 
 ['10','11','12','13','1j','2j','3j'].forEach(function(s){ var
                                                    label=s.endsWith('j') ? 'UK ' +s.replace('j','') : 'UK ' +s; 
 s 
 s 
 s 
 label 
 }); 
 ['3','4','5','6','7','8'].forEach(function(s){ 
 s 
 s.replace('.','_') 
 s.replace('.','_') 
 s 
 }); 
 ['6','7','8','9','10','11','12'].forEach(function(s){ 
 s 
 s.replace('.','_') 
 s.replace('.','_') 
 s 
 }); 
 } 
 if(shop.category==='Fashion' ) { 
 ['0-3M','3-6M','6-9M','9-12M','12-18M','18-24M'].forEach(function(s){
                                                            
 s 
 s.replace('-','_') 
 s.replace('-','_') 
 s 
 }); 
 ['2-3Y','3-4Y','4-5Y','5-6Y','6-7Y','7-8Y','8-9Y','9-10Y','10-11Y','11-12Y','12-13Y','13-14Y','14-15Y'].forEach(function(s){
                                                            
 s 
 s.replace('-','_') 
 s.replace('-','_') 
 s 
 }); 
 ['XS','S','M','L','XL','XXL','XXXL'].forEach(function(s){ 
 s 
 s 
 s 
 s 
 }); 
 ['XS','S','M','L','XL','XXL','XXXL'].forEach(function(s){ 
 s 
 s 
 s 
 s 
 }); 
 } 
 if (typeof currUser !=='undefined' && currUser) { 
 } else { 
 shop._id 
 } 
 if (shop.upiScanner && shop.upiScanner.url) { 
 optimizeImage(shop.upiScanner.url) 
 if (currUser && shop.owner._id.equals(currUser._id)) { 
 shop._id 
 } 
 } else if (currUser && shop.owner._id.equals(currUser._id)) { 
 shop._id 
 } else { 
 } 
 shop.shopName 
 shop._id 
 shop._id 
 shop.category 
 shop._id 
 if (!recentTransactions || recentTransactions.length===0) { 
 } else { 
 recentTransactions.forEach(tx=> { 
 if (tx.type==='PAYOUT_TO_SHOP' ) { 
 } else { 
 } 
 parseFloat(tx.amount).toFixed(2) 
 new Date(tx.createdAt).toLocaleString('en-IN',
                                                            {day:'numeric', month:'short', year:'numeric',
                                                            hour:'2-digit', minute:'2-digit'}) 
 if (tx.status==='SUCCESS' ) { 
 } else if (tx.status==='PENDING' ) { 
 } else { 
 } 
 }) 
 } 
