import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:image_picker/image_picker.dart';
import '../services/api_service.dart';

class ListShopPage extends StatefulWidget {
  const ListShopPage({super.key});

  @override
  State<ListShopPage> createState() => _ListShopPageState();
}

class _ListShopPageState extends State<ListShopPage> {
  final _formKey = GlobalKey<FormState>();
  final _nameCtrl = TextEditingController();
  final _descCtrl = TextEditingController();
  final _catCtrl = TextEditingController();
  final _locCtrl = TextEditingController();
  final _openCtrl = TextEditingController();
  final _closeCtrl = TextEditingController();
  final _upiCtrl = TextEditingController();
  final _gstCtrl = TextEditingController();
  
  XFile? _imageFile;
  bool _isLoading = false;

  Future<void> _pickImage() async {
    final picker = ImagePicker();
    final pickedFile = await picker.pickImage(source: ImageSource.gallery, imageQuality: 70);
    if (pickedFile != null) {
      setState(() => _imageFile = pickedFile);
    }
  }

  Future<void> _submitForm() async {
    if (!_formKey.currentState!.validate()) return;
    
    setState(() => _isLoading = true);
    try {
      final fields = {
        'shop[shopName]': _nameCtrl.text.trim(),
        'shop[shopDescription]': _descCtrl.text.trim(),
        'shop[category]': _catCtrl.text.trim(),
        'shop[location]': _locCtrl.text.trim(),
        'shop[openingTime]': _openCtrl.text.trim(),
        'shop[closingTime]': _closeCtrl.text.trim(),
        'shop[upiId]': _upiCtrl.text.trim(),
        'shop[gstNumber]': _gstCtrl.text.trim(),
      };

      final response = await ApiService.postMultipart(
        '/shops',
        fields,
        fileField: 'shopImage',
        filePath: _imageFile?.path,
      );

      if (!mounted) return;
      if (response.statusCode == 200 || response.statusCode == 302) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Shop registered successfully!')));
        Navigator.pop(context);
      } else {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Failed to register shop.')));
      }
    } catch (e) {
      if (!mounted) return;
      ScaffoldMessenger.of(context).showSnackBar(SnackBar(content: Text('Error: $e')));
    } finally {
      if (mounted) setState(() => _isLoading = false);
    }
  }

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('List Your Shop')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Form(
          key: _formKey,
          child: Column(
            children: [
              _buildTextField(_nameCtrl, 'Shop Name', Icons.store),
              const SizedBox(height: 12),
              _buildTextField(_descCtrl, 'Description', Icons.description, maxLines: 3),
              const SizedBox(height: 12),
              DropdownButtonFormField<String>(
                value: _catCtrl.text.isEmpty ? null : _catCtrl.text,
                isExpanded: true,
                decoration: InputDecoration(
                  labelText: 'Category *',
                  prefixIcon: const Icon(Icons.category, color: Colors.grey),
                  border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
                  filled: true,
                  fillColor: Colors.white,
                ),
                items: const [
                  'Automobile', 'Bakery', 'Beauty/Cosmetics', 'Coaching', 'Dhaba', 'Electronics',
                  'Fashion', 'Footwear', 'Furniture', 'General Store', 'Grocery', 'Hardware',
                  'Jewelers', 'Medical', 'Mobile Shop', 'Non-Veg', 'Printing & Digital',
                  'Restaurant', 'Salon', 'Seeds & Fertilizers', 'Sports', 'Stationery',
                  'Sweet Shop', 'Vegetables & Fruits', 'Wholesale', 'Others'
                ].map((String category) {
                  return DropdownMenuItem(value: category, child: Text(category, overflow: TextOverflow.ellipsis));
                }).toList(),
                onChanged: (value) {
                  if (value != null) setState(() => _catCtrl.text = value);
                },
                validator: (value) => (value == null || value.isEmpty) ? 'Please select a category' : null,
              ),
              const SizedBox(height: 12),
              _buildTextField(_locCtrl, 'Location (Address)', Icons.location_on),
              const SizedBox(height: 12),
              Row(
                children: [
                  Expanded(child: _buildTimeField(_openCtrl, 'Opening Time', context)),
                  const SizedBox(width: 12),
                  Expanded(child: _buildTimeField(_closeCtrl, 'Closing Time', context)),
                ],
              ),
              const SizedBox(height: 12),
              _buildTextField(_upiCtrl, 'UPI ID', Icons.payment),
              const SizedBox(height: 12),
              _buildTextField(_gstCtrl, 'GST Number (Optional)', Icons.receipt_long, required: false),
              const SizedBox(height: 20),
              GestureDetector(
                onTap: _pickImage,
                child: Container(
                  height: 120,
                  width: double.infinity,
                  decoration: BoxDecoration(
                    color: Colors.grey.shade200,
                    borderRadius: BorderRadius.circular(12),
                    border: Border.all(color: Colors.grey.shade400, style: BorderStyle.solid),
                  ),
                  child: _imageFile != null
                      ? ClipRRect(borderRadius: BorderRadius.circular(12), child: Image.network(_imageFile!.path, fit: BoxFit.cover, errorBuilder: (c,e,s) => const Center(child: Text("Image ready"))))
                      : Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: const [
                            Icon(Icons.add_photo_alternate, size: 40, color: Colors.grey),
                            SizedBox(height: 8),
                            Text('Upload Shop Image', style: TextStyle(color: Colors.grey)),
                          ],
                        ),
                ),
              ),
              const SizedBox(height: 32),
              SizedBox(
                width: double.infinity,
                height: 50,
                child: ElevatedButton(
                  onPressed: _isLoading ? null : _submitForm,
                  style: ElevatedButton.styleFrom(backgroundColor: Colors.blue, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
                  child: _isLoading 
                    ? const CircularProgressIndicator(color: Colors.white)
                    : Text('List My Shop', style: GoogleFonts.outfit(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildTextField(TextEditingController controller, String label, IconData icon, {bool required = true, int maxLines = 1}) {
    return TextFormField(
      controller: controller,
      maxLines: maxLines,
      validator: (value) => (required && value!.isEmpty) ? 'Please enter $label' : null,
      decoration: InputDecoration(
        labelText: label,
        prefixIcon: Icon(icon, color: Colors.grey),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
        filled: true,
        fillColor: Colors.white,
      ),
    );
  }

  Widget _buildTimeField(TextEditingController controller, String label, BuildContext context) {
    return TextFormField(
      controller: controller,
      readOnly: true,
      validator: (value) => value!.isEmpty ? 'Please select $label' : null,
      onTap: () async {
        final TimeOfDay? picked = await showTimePicker(
          context: context,
          initialTime: TimeOfDay.now(),
        );
        if (picked != null) {
          // ignore: use_build_context_synchronously
          controller.text = picked.format(context);
        }
      },
      decoration: InputDecoration(
        labelText: label,
        prefixIcon: const Icon(Icons.access_time, color: Colors.grey),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
        filled: true,
        fillColor: Colors.white,
      ),
    );
  }
}
