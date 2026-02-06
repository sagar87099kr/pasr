
// Create Item
router.post("/shops/:id/items", isLogedin, isShopOwner, upload.single("item[img]"), validateItem, wrapAsync(async (req, res) => {
    const { id } = req.params;
    const shop = await Shop.findById(id);
    if (!shop) {
        req.flash("error", "Shop not found");
        return res.redirect("/shops");
    }

    const itemData = req.body.item;
    const newItem = new Item(itemData);

    if (req.file) {
        newItem.img = { url: req.file.path, filename: req.file.filename };
    }

    newItem.shop = shop._id;
    shop.items.push(newItem);

    await newItem.save();
    await shop.save();

    req.flash("success", "Item added successfully!");
    res.redirect(`/shops/${id}`);
}));

// Delete Item
router.delete("/shops/:id/items/:itemId", isLogedin, isShopOwner, wrapAsync(async (req, res) => {
    const { id, itemId } = req.params;
    await Shop.findByIdAndUpdate(id, { $pull: { items: itemId } });
    await Item.findByIdAndDelete(itemId);
    req.flash("success", "Item deleted successfully");
    res.redirect(`/shops/${id}`);
}));
