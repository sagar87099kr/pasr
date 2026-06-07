const fs = require('fs');
const path = require('path');
const file = path.join(__dirname, 'views/pages/search_results.ejs');
let content = fs.readFileSync(file, 'utf8');

const itemsMatch = content.match(/(<!-- Shop Items -->[\s\S]*?)(?=<!-- Products -->)/);
const productsMatch = content.match(/(<!-- Products -->[\s\S]*?)(?=<!-- Service Providers -->)/);
const providersMatch = content.match(/(<!-- Service Providers -->[\s\S]*?)(?=<!-- Local Shops -->)/);
const shopsMatch = content.match(/(<!-- Local Shops -->[\s\S]*?)(?=<!-- No Results -->)/);

if (itemsMatch && productsMatch && providersMatch && shopsMatch) {
    const items = itemsMatch[1];
    const products = productsMatch[1];
    const providers = providersMatch[1];
    const shops = shopsMatch[1];

    content = content.replace(itemsMatch[0], '')
                     .replace(productsMatch[0], '')
                     .replace(providersMatch[0], '')
                     .replace(shopsMatch[0], items + shops + products + providers);

    fs.writeFileSync(file, content);
    console.log("Reordered successfully!");
} else {
    console.log("Failed to match blocks");
}
