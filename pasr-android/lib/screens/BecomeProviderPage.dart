import 'package:flutter/material.dart';
import 'package:google_fonts/google_fonts.dart';
import 'package:image_picker/image_picker.dart';
import 'dart:io';
import '../services/api_service.dart';
import '../widgets/ProfileCompletionSheet.dart';

class BecomeProviderPage extends StatefulWidget {
  const BecomeProviderPage({super.key});

  @override
  State<BecomeProviderPage> createState() => _BecomeProviderPageState();
}

class _BecomeProviderPageState extends State<BecomeProviderPage> {
  final _formKey = GlobalKey<FormState>();
  final _companyCtrl = TextEditingController();
  final _expCtrl = TextEditingController();
  final _locCtrl = TextEditingController();
  final _phoneCtrl = TextEditingController();
  final _catCtrl = TextEditingController();
  
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
        'provider[company]': _companyCtrl.text.trim(),
        'provider[experience]': _expCtrl.text.trim(),
        'provider[location]': _locCtrl.text.trim(),
        'provider[phoneNO]': _phoneCtrl.text.trim(),
        'provider[categories]': _catCtrl.text.trim(),
      };

      final response = await ApiService.postMultipart(
        '/become/provider',
        fields,
        fileField: 'provider[personImage]',
        filePath: _imageFile?.path,
      );

      if (!mounted) return;
      if (response.statusCode == 200 || response.statusCode == 302) {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Registered as Provider successfully!')));
        Navigator.pop(context);
      } else {
        ScaffoldMessenger.of(context).showSnackBar(const SnackBar(content: Text('Failed to register.')));
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
      appBar: AppBar(title: const Text('Become a Provider')),
      body: SingleChildScrollView(
        padding: const EdgeInsets.all(16),
        child: Form(
          key: _formKey,
          child: Column(
            children: [
              _buildTextField(_companyCtrl, 'Company/Your Name', Icons.business),
              const SizedBox(height: 12),
              _buildTextField(_expCtrl, 'Experience (Years)', Icons.work_history, isNumber: true),
              const SizedBox(height: 12),
              _buildTextField(_locCtrl, 'Location', Icons.location_on),
              const SizedBox(height: 12),
              _buildTextField(_phoneCtrl, 'Phone Number', Icons.phone, isNumber: true),
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
                  'Farming Vehicles', 'Four Wheelers', 'HMV (Bus)', 'Three Wheelers', 
                  'Caterings', 'Filming', 'Decoration', 'DJ and Tent', 'Band Party', 
                  'Home Service provider', 'Heavy Equipments', 'Others'
                ].map((String category) {
                  return DropdownMenuItem(value: category, child: Text(category, overflow: TextOverflow.ellipsis));
                }).toList(),
                onChanged: (value) {
                  if (value != null) setState(() => _catCtrl.text = value);
                },
                validator: (value) => (value == null || value.isEmpty) ? 'Please select a category' : null,
              ),
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
                      ? ClipRRect(borderRadius: BorderRadius.circular(12), child: Image.file(File(_imageFile!.path), fit: BoxFit.cover, errorBuilder: (c,e,s) => const Center(child: Text("Error loading image"))))
                      : Column(
                          mainAxisAlignment: MainAxisAlignment.center,
                          children: const [
                            Icon(Icons.person_add_alt_1, size: 40, color: Colors.grey),
                            SizedBox(height: 8),
                            Text('Upload Profile Image', style: TextStyle(color: Colors.grey)),
                          ],
                        ),
                ),
              ),
              const SizedBox(height: 32),
              SizedBox(
                width: double.infinity,
                height: 50,
                child: ElevatedButton(
                  onPressed: _isLoading ? null : () {
                    if (!_formKey.currentState!.validate()) return;
                    ProfileCompletionSheet.checkAndShow(context, _submitForm);
                  },
                  style: ElevatedButton.styleFrom(backgroundColor: Colors.purple, shape: RoundedRectangleBorder(borderRadius: BorderRadius.circular(12))),
                  child: _isLoading 
                    ? const CircularProgressIndicator(color: Colors.white)
                    : Text('Register as Provider', style: GoogleFonts.outfit(color: Colors.white, fontSize: 16, fontWeight: FontWeight.bold)),
                ),
              ),
            ],
          ),
        ),
      ),
    );
  }

  Widget _buildTextField(TextEditingController controller, String label, IconData icon, {bool isNumber = false}) {
    return TextFormField(
      controller: controller,
      keyboardType: isNumber ? TextInputType.number : TextInputType.text,
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
