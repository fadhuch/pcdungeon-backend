const express = require('express');
const axios = require('axios');
const router = express.Router();

// Telegram Bot Configuration
const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN || 'YOUR_BOT_TOKEN_HERE';
const TELEGRAM_API_URL = `https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}`;

// Webhook endpoint for Telegram bot
router.post('/telegram-webhook', async (req, res) => {
    try {
        console.log('Telegram webhook received:', JSON.stringify(req.body, null, 2));
        
        const update = req.body;
        
        // Check if the update contains a message
        if (update.message) {
            const message = update.message;
            const chatId = message.chat.id;
            const text = message.text;
            
            console.log(`Received message from chat ${chatId}: ${text}`);
            
            // Handle help commands
            if (text && (text.toLowerCase().includes('/help') || 
                        text.toLowerCase().includes('help') || 
                        text.toLowerCase().includes('/format') || 
                        text.toLowerCase().includes('format') ||
                        text.toLowerCase().includes('/example') ||
                        text.toLowerCase().includes('example'))) {
                sendHelpMessage(chatId).catch(err => console.error('Help message error:', err));
                res.status(200).json({ status: 'success', message: 'Webhook processed' });
                return;
            }
            
            // Handle format request commands
            if (text && (text.toLowerCase().includes('/formats') || 
                        text.toLowerCase().includes('formats') ||
                        text.toLowerCase().includes('how to add product') ||
                        text.toLowerCase().includes('product format'))) {
                sendFormatExamples(chatId).catch(err => console.error('Format message error:', err));
                res.status(200).json({ status: 'success', message: 'Webhook processed' });
                return;
            }
            
            // Check if the message is exactly "new product" - send form template
            if (text && text.toLowerCase().trim() === 'new product') {
                await sendProductForm(chatId);
                res.status(200).json({ status: 'success', message: 'Product form sent' });
                return;
            }
            // Check if the message contains product information in structured or multi-line format
            else if (text && ((text.toLowerCase().includes('name:') && 
                         (text.toLowerCase().includes('price:') || 
                          text.toLowerCase().includes('product:') || 
                          text.toLowerCase().includes('supplier:'))) ||
                         text.toLowerCase().startsWith('new product'))) {
                await handleProductMessage(message);
            } else {
                // Send acknowledgment response for non-product messages
                await sendTelegramMessage(chatId, `👋 Hi! Send /help to see how to add products, or type "format" for the message template.`);
            }
        }
        
        // Check if the update contains a channel post
        if (update.channel_post) {
            const post = update.channel_post;
            const chatId = post.chat.id;
            const text = post.text;
            
            console.log(`Received channel post from ${chatId}: ${text}`);
            
            // Process channel post for product information
            if (text) {
                await handleChannelPost(post);
            }
        }
        
        res.status(200).json({ status: 'success', message: 'Webhook processed' });
    } catch (error) {
        console.error('Telegram webhook error:', error);
        res.status(500).json({ status: 'error', message: error.message });
    }
});

// Handle product messages
async function handleProductMessage(message) {
    try {
        const text = message.text;
        const chatId = message.chat.id;
        
        // Parse product information from message
        const productInfo = parseProductFromMessage(text);
        
        if (productInfo) {
            let supplierId = null;
            let supplierName = 'Unknown Supplier';
            
            // If supplier name is provided, find or create supplier
            if (productInfo.supplier) {
                console.log(`Looking for supplier: ${productInfo.supplier}`);
                
                // Try to find existing supplier
                let existingSupplier = await findSupplierByName(productInfo.supplier);
                
                if (existingSupplier) {
                    supplierId = existingSupplier._id;
                    supplierName = existingSupplier.name;
                    console.log(`Found existing supplier: ${supplierName} (${supplierId})`);
                } else {
                    // Create new supplier
                    console.log(`Creating new supplier: ${productInfo.supplier}`);
                    try {
                        const newSupplier = await createSupplier(productInfo.supplier);
                        supplierId = newSupplier._id;
                        supplierName = newSupplier.name;
                        console.log(`Created new supplier: ${supplierName} (${supplierId})`);
                    } catch (supplierError) {
                        console.error('Error creating supplier:', supplierError);
                        // Continue without supplier if creation fails
                    }
                }
            }
            
            // Create product in database
            const productData = {
                name: productInfo.name,
                category: productInfo.category || 'Telegram Import',
                description: productInfo.description || text,
                status: 'Available'
            };
            
            // Add supplier with price if available
            if (supplierId && productInfo.price) {
                productData.suppliers = [{
                    supplier: supplierId,
                    price: productInfo.price,
                    lastUpdated: new Date()
                }];
            } else {
                productData.suppliers = [];
            }
            
            console.log('Creating product with data:', JSON.stringify(productData, null, 2));
            
            // Make API call to create product
            const response = await axios.post('https://api.cartiquestore.com/api/products', productData);
            
            console.log('Product creation response:', response.data);
            
            if (response.data.status === 'success') {
                const product = response.data.data;
                let successMessage = `✅ Product "${productInfo.name}" has been added successfully!`;
                
                if (supplierId && productInfo.price) {
                    successMessage += `\n💰 Price: ${productInfo.price} (from ${supplierName})`;
                }
                if (productInfo.category) {
                    successMessage += `\n📂 Category: ${productInfo.category}`;
                }
                
                await sendTelegramMessage(chatId, successMessage);
                console.log('Product created from Telegram:', product);
            } else {
                console.error('Product creation failed:', response.data);
                throw new Error(`Failed to create product: ${response.data.message || 'Unknown error'}`);
            }
        } else {
            await sendTelegramMessage(chatId, `❌ Could not parse product information from message. 

Please use one of these formats:

<b>Structured Format:</b>
<code>Name: 
Price: 
Category: 
Description: 
Supplier: </code>

<b>Quick Multi-Line Format:</b>
<code>new product
[Product Name]
[Price]
[Supplier Name]
[Description]</code>

<b>Quick Comma Format:</b>
<code>new product, [Product Name], [Price], [Supplier Name], [Description]</code>

Type /formats for examples!`);
        }
    } catch (error) {
        console.error('Error handling product message:', error);
        await sendTelegramMessage(message.chat.id, `❌ Error processing product: ${error.message}`);
    }
}

// Handle channel posts
async function handleChannelPost(post) {
    try {
        const text = post.text;
        
        // Parse product information from channel post
        const productInfo = parseProductFromMessage(text);
        
        if (productInfo) {
            let supplierId = null;
            let supplierName = 'Channel Import';
            
            // If supplier name is provided, find or create supplier
            if (productInfo.supplier) {
                console.log(`Looking for supplier in channel post: ${productInfo.supplier}`);
                
                // Try to find existing supplier
                let existingSupplier = await findSupplierByName(productInfo.supplier);
                
                if (existingSupplier) {
                    supplierId = existingSupplier._id;
                    supplierName = existingSupplier.name;
                    console.log(`Found existing supplier: ${supplierName} (${supplierId})`);
                } else {
                    // Create new supplier
                    console.log(`Creating new supplier from channel: ${productInfo.supplier}`);
                    try {
                        const newSupplier = await createSupplier(productInfo.supplier);
                        supplierId = newSupplier._id;
                        supplierName = newSupplier.name;
                        console.log(`Created new supplier: ${supplierName} (${supplierId})`);
                    } catch (supplierError) {
                        console.error('Error creating supplier from channel:', supplierError);
                        // Continue without supplier if creation fails
                    }
                }
            }
            
            // Create product in database
            const productData = {
                name: productInfo.name,
                category: productInfo.category || 'Channel Import',
                description: productInfo.description || text,
                status: 'Available',
                suppliers: [],
                source: 'telegram_channel',
                telegramPostId: post.message_id,
                telegramChatId: post.chat.id
            };
            
            // Add supplier with price if available
            if (supplierId && productInfo.price) {
                productData.suppliers = [{
                    supplier: supplierId,
                    price: productInfo.price,
                    lastUpdated: new Date()
                }];
            }
            
            // Make API call to create product
            const response = await axios.post('https://api.cartiquestore.com/api/products', productData);
            
            if (response.data.status === 'success') {
                console.log('Product created from channel post:', response.data.data);
                console.log(`Channel import: ${productInfo.name} - ${productInfo.price ? `$${productInfo.price}` : 'No price'} - ${supplierName}`);
                
                // Optionally send a message to the channel or admin
                // await sendTelegramMessage(post.chat.id, `✅ Product "${productInfo.name}" imported successfully!`);
            }
        }
    } catch (error) {
        console.error('Error handling channel post:', error);
    }
}

// Parse product information from message text
function parseProductFromMessage(text) {
    try {
        const lines = text.split('\n').map(line => line.trim()).filter(line => line);
        let name = null, price = null, category = null, description = null, supplier = null;
        
        // Check for "new product" comma-separated format
        if (text.toLowerCase().startsWith('new product,')) {
            // Remove "new product," and split by comma
            const productText = text.substring(12).trim(); // Remove "new product,"
            const parts = productText.split(',').map(part => part.trim());
            
            if (parts.length >= 4) {
                // Comma-separated format: new product, name, price, supplier, description
                name = parts[0] && parts[0].trim() ? parts[0].trim() : null;
                
                // Extract price from part 1
                const priceText = parts[1] || '';
                const priceMatch = priceText.match(/[\d.]+/);
                price = priceMatch ? parseFloat(priceMatch[0]) : null;
                
                supplier = parts[2] && parts[2].trim() ? parts[2].trim() : null;
                description = parts[3] && parts[3].trim() ? parts[3].trim() : null;
                category = 'Telegram Import'; // Default category for comma-separated format
                
                console.log('Parsed comma-separated format:', { name, price, supplier, description, category });
                
                if (name && price && supplier && description) {
                    return { name, price, category, description, supplier };
                }
            }
        }
        
        // Check for "new product" multi-line format (keep for backward compatibility)
        else if (text.toLowerCase().startsWith('new product')) {
            // Multi-line format: new product, name, price, supplier, description
            name = lines[1] || null;
            
            // Extract price from line 2
            const priceText = lines[2] || '';
            const priceMatch = priceText.match(/[\d.]+/);
            price = priceMatch ? parseFloat(priceMatch[0]) : null;
            
            supplier = lines[3] || null;
            description = lines[4] || null;
            category = 'Telegram Import'; // Default category for multi-line format
            
            console.log('Parsed multi-line format:', { name, price, supplier, description, category });
            
            if (name && price && supplier && description) {
                return { name, price, category, description, supplier };
            }
        }
        
        // Parse the structured format: Name, Price, Category, Description, Supplier
        for (const line of lines) {
            const lowerLine = line.toLowerCase();
            
            if (lowerLine.startsWith('name:')) {
                name = line.split(':').slice(1).join(':').trim();
            } else if (lowerLine.startsWith('price:')) {
                const priceText = line.split(':').slice(1).join(':').trim();
                // Extract numeric value from price
                const priceMatch = priceText.match(/[\d.]+/);
                price = priceMatch ? parseFloat(priceMatch[0]) : null;
            } else if (lowerLine.startsWith('category:')) {
                category = line.split(':').slice(1).join(':').trim();
            } else if (lowerLine.startsWith('description:')) {
                description = line.split(':').slice(1).join(':').trim();
            } else if (lowerLine.startsWith('supplier:')) {
                supplier = line.split(':').slice(1).join(':').trim();
            }
        }
        
        // Check if we have all required fields
        if (name && price && category && description && supplier) {
            return {
                name,
                price,
                category,
                description,
                supplier
            };
        }
        
        // Fallback: Try to detect if this looks like a product message for backward compatibility
        if (text.toLowerCase().includes('product:') || text.toLowerCase().includes('name:')) {
            // Old format fallback - extract what we can
            const productRegex = /(?:product|name):\s*([^,\n]+)(?:,\s*category:\s*([^,\n]+))?(?:,\s*description:\s*([^,\n]+))?/i;
            const match = text.match(productRegex);
            
            if (match) {
                return {
                    name: match[1].trim(),
                    price: null,
                    category: match[2] ? match[2].trim() : 'Telegram Import',
                    description: match[3] ? match[3].trim() : 'Added via Telegram',
                    supplier: null
                };
            }
        }
        
        return null;
    } catch (error) {
        console.error('Error parsing product from message:', error);
        return null;
    }
}

// Find supplier by name (case-insensitive, partial match)
async function findSupplierByName(supplierName) {
    try {
        // Make API call to search for suppliers
        const response = await axios.get(`https://api.cartiquestore.com/api/suppliers?search=${encodeURIComponent(supplierName)}`);
        
        if (response.data.status === 'success' && response.data.data.length > 0) {
            // Find exact or close match
            const suppliers = response.data.data;
            
            // First try exact match (case-insensitive)
            let exactMatch = suppliers.find(s => 
                s.name.toLowerCase() === supplierName.toLowerCase()
            );
            
            if (exactMatch) {
                return exactMatch;
            }
            
            // Then try partial match (case-insensitive)
            let partialMatch = suppliers.find(s => 
                s.name.toLowerCase().includes(supplierName.toLowerCase()) ||
                supplierName.toLowerCase().includes(s.name.toLowerCase())
            );
            
            if (partialMatch) {
                return partialMatch;
            }
        }
        
        return null;
    } catch (error) {
        console.error('Error finding supplier:', error);
        return null;
    }
}

// Create new supplier
async function createSupplier(supplierName) {
    try {
        const supplierData = {
            name: supplierName,
            contact: 'Added via Telegram',
            phone: 'N/A',
            address: 'Added automatically via Telegram Bot',
            email: '',
            website: '',
            location: ''
        };
        
        const response = await axios.post('https://api.cartiquestore.com/api/suppliers', supplierData);
        
        if (response.data.status === 'success') {
            console.log('New supplier created:', response.data.data);
            return response.data.data;
        }
        
        throw new Error('Failed to create supplier');
    } catch (error) {
        console.error('Error creating supplier:', error);
        throw error;
    }
}

// Send message to Telegram
async function sendTelegramMessage(chatId, text) {
    try {
        // Skip sending message in test environment
        if (chatId === 123456 || chatId === 123456789) {
            console.log(`Test message would be sent to ${chatId}: ${text}`);
            return { ok: true };
        }
        
        const response = await axios.post(`${TELEGRAM_API_URL}/sendMessage`, {
            chat_id: chatId,
            text: text,
            parse_mode: 'HTML'
        });
        return response.data;
    } catch (error) {
        console.error('Error sending Telegram message:', error.message);
        // Don't throw error, just log it to prevent blocking
        return { ok: false, error: error.message };
    }
}

// Function to send product form template
async function sendProductForm(chatId) {
    const formMessage = `📝 **Product Information Form**

Please fill out the form below and send it back:

\`\`\`
Name: 
Price: 
Category: 
Description: 
Supplier: 
\`\`\`

**Example:**
\`\`\`
Name: Samsung Galaxy S24
Price: 999
Category: Electronics
Description: Latest flagship smartphone with AI features
Supplier: Samsung Official Store
\`\`\`

💡 **Tip:** You can also use other formats like:
• Multi-line format (start with "new product")
• Comma-separated format

Type "format" to see all available formats.`;

    try {
        await axios.post(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
            chat_id: chatId,
            text: formMessage,
            parse_mode: 'Markdown'
        });
        console.log(`✅ Product form sent to chat ${chatId}`);
    } catch (error) {
        console.error('❌ Error sending product form:', error.response?.data || error.message);
    }
}

// Send help message with available commands
async function sendHelpMessage(chatId) {
    const helpText = `
🤖 <b>Alshiraa Product Bot - Help</b>

<b>Available Commands:</b>
• <code>/help</code> - Show this help message
• <code>/formats</code> - Show product format examples
• <code>/example</code> - Show sample product entries

<b>Quick Commands:</b>
• Type <code>help</code> - Get assistance
• Type <code>format</code> - See message formats
• Type <code>example</code> - Get examples

<b>To Add Products:</b>
• Type <code>new product</code> - Get an interactive form template
• Send a message with product information in one of these formats:

<b>Interactive Form:</b>
Type <code>new product</code> and the bot will provide a template form for you to fill out.

<b>Structured Format:</b>
<code>Name: [Product Name]
Price: [Price in numbers]
Category: [Category Name]
Description: [Product Description]  
Supplier: [Supplier Name]</code>

<b>Quick Multi-Line Format:</b>
<code>new product
[Product Name]
[Price]
[Supplier Name]
[Description]</code>

<b>Quick Comma Format:</b>
<code>new product, [Product Name], [Price], [Supplier Name], [Description]</code>

<b>Examples:</b>
<code>Name: iPhone 15 Pro
Price: 999
Category: Smartphones
Description: Latest iPhone model with A17 Pro chip
Supplier: Apple Store</code>

<code>new product
iPhone 15 Pro
999
Apple Store
Latest iPhone model with A17 Pro chip</code>

<code>new product, iPhone 15 Pro, 999, Apple Store, Latest iPhone model with A17 Pro chip</code>

<b>🔔 Key Features:</b>
• Suppliers are matched automatically (case-insensitive)
• New suppliers are created if not found
• Products appear in your dashboard instantly
• All fields are required for best results

<b>Need examples?</b> Type <code>/formats</code>

✅ Ready to add products? Use the format above!
`;
    
    await sendTelegramMessage(chatId, helpText);
}

// Send detailed format examples
async function sendFormatExamples(chatId) {
    const formatText = `
📝 <b>Product Message Formats</b>

<b>🎯 Complete Format (Recommended)</b>
<code>Name: iPhone 15 Pro Max
Price: 1299
Category: Smartphones
Description: Latest iPhone with titanium design and advanced camera system
Supplier: Apple Store</code>

<b>⚡ Quick Multi-Line Format</b>
<code>new product
iPhone 15 Pro Max
1299
Apple Store
Latest iPhone with titanium design and advanced camera system</code>

<b>⚡ Quick Comma Format</b>
<code>new product, iPhone 15 Pro Max, 1299, Apple Store, Latest iPhone with titanium design and advanced camera system</code>

<b>📋 Copy-Paste Templates:</b>

<b>Structured Template:</b>
<code>Name: [Product Name]
Price: [Price in numbers only]
Category: [Category Name]
Description: [Product Description]
Supplier: [Supplier Name]</code>

<b>Quick Template:</b>
<code>new product
[Product Name]
[Price]
[Supplier Name]
[Description]</code>

<b>Comma Template:</b>
<code>new product, [Product Name], [Price], [Supplier Name], [Description]</code>

<b>📱 Real Examples:</b>

<b>Electronics (Structured):</b>
<code>Name: Gaming Headset Pro X
Price: 89.99
Category: Gaming
Description: 7.1 surround sound gaming headset with RGB lighting
Supplier: TechGear Plus</code>

<b>Electronics (Quick):</b>
<code>new product
Gaming Headset Pro X
89.99
TechGear Plus
7.1 surround sound gaming headset with RGB lighting</code>

<b>Electronics (Comma):</b>
<code>new product, Gaming Headset Pro X, 89.99, TechGear Plus, 7.1 surround sound gaming headset with RGB lighting</code>

<b>Home & Kitchen (Structured):</b>
<code>Name: Smart Air Fryer 8L
Price: 159.50
Category: Kitchen
Description: WiFi-enabled air fryer with app control and 12 preset modes
Supplier: KitchenMart</code>

<b>Home & Kitchen (Quick):</b>
<code>new product
Smart Air Fryer 8L
159.50
KitchenMart
WiFi-enabled air fryer with app control and 12 preset modes</code>

<b>Home & Kitchen (Comma):</b>
<code>new product, Smart Air Fryer 8L, 159.50, KitchenMart, WiFi-enabled air fryer with app control and 12 preset modes</code>

<b>🔔 Important Notes:</b>
• <b>Structured format:</b> All fields required, custom category
• <b>Quick format:</b> Start with "new product", category defaults to "Telegram Import"
• Price should be numbers only (no currency symbols)
• If supplier doesn't exist, it will be created automatically
• Supplier matching is case-insensitive and flexible
• Products appear in your dashboard instantly

Ready to add products? Copy the template above! 🚀
`;
    
    await sendTelegramMessage(chatId, formatText);
}

// Set webhook URL (call this once to configure the webhook)
router.post('/set-webhook', async (req, res) => {
    try {
        const { webhookUrl } = req.body;
        
        if (!webhookUrl) {
            return res.status(400).json({ 
                status: 'error', 
                message: 'webhookUrl is required' 
            });
        }
        
        const response = await axios.post(`${TELEGRAM_API_URL}/setWebhook`, {
            url: webhookUrl,
            allowed_updates: ['message', 'channel_post']
        });
        
        res.json({
            status: 'success',
            message: 'Webhook set successfully',
            data: response.data
        });
    } catch (error) {
        console.error('Error setting webhook:', error);
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
});

// Get webhook info
router.get('/webhook-info', async (req, res) => {
    try {
        const response = await axios.get(`${TELEGRAM_API_URL}/getWebhookInfo`);
        res.json({
            status: 'success',
            data: response.data
        });
    } catch (error) {
        console.error('Error getting webhook info:', error);
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
});

// Remove webhook
router.post('/remove-webhook', async (req, res) => {
    try {
        const response = await axios.post(`${TELEGRAM_API_URL}/deleteWebhook`);
        res.json({
            status: 'success',
            message: 'Webhook removed successfully',
            data: response.data
        });
    } catch (error) {
        console.error('Error removing webhook:', error);
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
});

// Test endpoint to send a message
router.post('/send-message', async (req, res) => {
    try {
        const { chatId, message } = req.body;
        
        if (!chatId || !message) {
            return res.status(400).json({
                status: 'error',
                message: 'chatId and message are required'
            });
        }
        
        const result = await sendTelegramMessage(chatId, message);
        res.json({
            status: 'success',
            data: result
        });
    } catch (error) {
        console.error('Error sending message:', error);
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
});

// Get product message formats and examples
router.get('/product-formats', (req, res) => {
    try {
        const formats = {
            status: 'success',
            data: {
                structured_format: {
                    type: 'structured_format',
                    name: 'Structured Product Format',
                    description: 'Complete format with custom category - includes name, price, category, description, and supplier',
                    template: 'Name: [Product Name]\nPrice: [Price in numbers only]\nCategory: [Category Name]\nDescription: [Product Description]\nSupplier: [Supplier Name]',
                    example: 'Name: iPhone 15 Pro\nPrice: 999\nCategory: Smartphones\nDescription: Latest iPhone model with A17 Pro chip\nSupplier: Apple Store',
                    required_fields: ['name', 'price', 'category', 'description', 'supplier']
                },
                quick_format: {
                    type: 'multi_line_format',
                    name: 'Quick Multi-Line Format',
                    description: 'Faster format starting with "new product" - category defaults to "Telegram Import"',
                    template: 'new product\n[Product Name]\n[Price]\n[Supplier Name]\n[Description]',
                    example: 'new product\niPhone 15 Pro\n999\nApple Store\nLatest iPhone model with A17 Pro chip',
                    required_fields: ['new product trigger', 'name', 'price', 'supplier', 'description'],
                    default_category: 'Telegram Import'
                },
                examples_by_category: {
                    electronics: {
                        structured: [
                            'Name: Gaming Headset Pro X\nPrice: 89.99\nCategory: Gaming\nDescription: 7.1 surround sound gaming headset with RGB lighting\nSupplier: TechGear Plus',
                            'Name: Smart TV 55 inch OLED\nPrice: 1299\nCategory: Electronics\nDescription: 4K OLED smart TV with HDR support and smart features\nSupplier: ElectroStore'
                        ],
                        quick: [
                            'new product\nGaming Headset Pro X\n89.99\nTechGear Plus\n7.1 surround sound gaming headset with RGB lighting',
                            'new product\nSmart TV 55 inch OLED\n1299\nElectroStore\n4K OLED smart TV with HDR support and smart features'
                        ]
                    },
                    home_kitchen: {
                        structured: [
                            'Name: Smart Air Fryer 8L\nPrice: 159.50\nCategory: Kitchen\nDescription: WiFi-enabled air fryer with app control and 12 preset modes\nSupplier: KitchenMart',
                            'Name: Robot Vacuum Cleaner\nPrice: 299\nCategory: Cleaning\nDescription: Self-navigating vacuum with mapping technology and auto-empty\nSupplier: HomeTech'
                        ],
                        quick: [
                            'new product\nSmart Air Fryer 8L\n159.50\nKitchenMart\nWiFi-enabled air fryer with app control and 12 preset modes',
                            'new product\nRobot Vacuum Cleaner\n299\nHomeTech\nSelf-navigating vacuum with mapping technology and auto-empty'
                        ]
                    },
                    accessories: {
                        structured: [
                            'Name: Wireless Charging Pad\nPrice: 29.99\nCategory: Accessories\nDescription: Fast 15W wireless charger compatible with all Qi devices\nSupplier: ElectroShop'
                        ],
                        quick: [
                            'new product\nWireless Charging Pad\n29.99\nElectroShop\nFast 15W wireless charger compatible with all Qi devices'
                        ]
                    }
                },
                features: {
                    supplier_matching: 'Suppliers are matched case-insensitive with partial matching',
                    supplier_creation: 'New suppliers are created automatically if not found',
                    price_handling: 'Prices are extracted as numbers (currency symbols ignored)',
                    category_creation: 'Categories are auto-created if they don\'t exist',
                    product_linking: 'Products are automatically linked to suppliers with prices'
                },
                help_commands: [
                    '/help - Show complete help message',
                    '/formats - Show format examples with templates',
                    '/example - Get sample product entries',
                    'help - Quick help command',
                    'format - Show message format',
                    'example - Get examples'
                ],
                tips: [
                    'Structured format: All 5 fields required, custom category',
                    'Quick format: Start with "new product", category defaults to "Telegram Import"',
                    'Price should be numbers only (no $ symbols)',
                    'Supplier names are matched flexibly',
                    'Use descriptive product names and categories',
                    'Include key features in descriptions',
                    'Products appear in dashboard instantly'
                ]
            }
        };
        
        res.json(formats);
    } catch (error) {
        console.error('Error getting product formats:', error);
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
});

// Send format help to a specific chat
router.post('/send-format-help', async (req, res) => {
    try {
        const { chatId, formatType } = req.body;
        
        if (!chatId) {
            return res.status(400).json({
                status: 'error',
                message: 'chatId is required'
            });
        }
        
        let message;
        if (formatType === 'help') {
            await sendHelpMessage(chatId);
            message = 'Help message sent';
        } else if (formatType === 'formats') {
            await sendFormatExamples(chatId);
            message = 'Format examples sent';
        } else {
            // Send both help and formats
            await sendHelpMessage(chatId);
            await sendFormatExamples(chatId);
            message = 'Complete help and format information sent';
        }
        
        res.json({
            status: 'success',
            message: message
        });
    } catch (error) {
        console.error('Error sending format help:', error);
        res.status(500).json({
            status: 'error',
            message: error.message
        });
    }
});

module.exports = router;
