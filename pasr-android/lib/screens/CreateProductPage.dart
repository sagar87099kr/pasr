import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:image_picker/image_picker.dart';
import 'dart:convert';
import '../services/api_service.dart';

class CreateProductPage extends StatefulWidget {
  const CreateProductPage({super.key});

  @override
  State<CreateProductPage> createState() => _CreateProductPageState();
}

class _CreateProductPageState extends State<CreateProductPage> {
  final _formKey = GlobalKey<FormState>();
  final _nameCtrl = TextEditingController();
  final _priceCtrl = TextEditingController();
  final _descCtrl = TextEditingController();
  final _locCtrl = TextEditingController();
  final _qtyCtrl = TextEditingController();
  final _catCtrl = TextEditingController();
  final _upiCtrl = TextEditingController();
  
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
        'product[productName]': _nameCtrl.text.trim(),
        'product[price]': _priceCtrl.text.trim(),
        'product[productDescription]': _descCtrl.text.trim(),
        'product[location]': _locCtrl.text.trim(),
        'product[quantity]': _qtyCtrl.text.trim(),
        'product[categories]': _catCtrl.text.trim(),
        'product[upiId]': _upiCtrl.text.trim(),
      };

      final response = await ApiService.postMultipart(
        '/product/seller',
        fields,
        fileField: 'productImage',
        filePath: _imageFile?.path,
      );

      if (!mounted) return;
      if (response.statusCode == 200 || response.statusCode == 302) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Product submitted successfully!')));
        Navigator.pop(context);
      } else {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Failed to submit product.')));
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
      appBar: AppBar(title: const Text('Sell Your Products')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Form(
          key: _formKey,
          child: Column(
            children: [
              _buildTextField(_nameCtrl, 'Product Name', Icons.inventory),
              const SizedBox(height: 12),
              _buildTextField(_priceCtrl, 'Price (₹)', Icons.currency_rupee, isNumber: true),
              const SizedBox(height: 12),
              _buildTextField(_descCtrl, 'Description', Icons.description, maxLines: 3),
              const SizedBox(height: 12),
              _buildTextField(_locCtrl, 'Location (Address)', Icons.location_on),
              const SizedBox(height: 12),
              _buildTextField(_qtyCtrl, 'Quantity', Icons.production_quantity_limits, isNumber: true),
              const SizedBox(height: 12),
              _buildTextField(_catCtrl, 'Category (e.g., Vegetables)', Icons.category),
              const SizedBox(height: 12),
              _buildTextField(_upiCtrl, 'UPI ID', Icons.payment),
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
                            Icon(Icons.add_a_photo, size: 40, color: Colors.grey),
                            SizedBox(height: 8),
                            Text('Upload Image', style: TextStyle(color: Colors.grey)),
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
                  style: ElevatedButton.styleFrom(backgroundColor: const Color(0xFF1E3A8A), shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
                  child: _isLoading 
                    ? const CircularProgressIndicator(color: Colors.white)
                    : Text('Submit Product', style: GoogleFonts.outfit(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildTextField(TextEditingController controller, String label, IconData icon, {bool isNumber = false, int maxLines = 1}) {
    return TextFormField(
      controller: controller,
      keyboardType: isNumber ? TextInputType.number : TextInputType.text,
      maxLines: maxLines,
      validator: (value) => value!.isEmpty ? 'Please enter $label' : null,
      decoration: InputDecoration(
        labelText: label,
        prefixIcon: Icon(icon, color: Colors.grey),
        border: OutlineInputBorder(borderRadius: BorderRadius.circular(12)),
        filled: true,
        fillColor: Colors.white,
      ),
    );
  }
}
