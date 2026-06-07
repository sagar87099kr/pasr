import 'package:flutter/material.dart';
import 'package:flutter/services.dart';
import 'package:google_fonts/google_fonts.dart';
import 'screens/HomePage.dart';
import 'screens/LoginPage.dart';
import 'services/AuthService.dart';

void main() async {
  WidgetsFlutterBinding.ensureInitialized();
  SystemChrome.setSystemUIOverlayStyle(const SystemUiOverlayStyle(
    statusBarColor: Colors.transparent,
    statusBarIconBrightness: Brightness.dark,
  ));
  runApp(const PaSrApp());
}

class PaSrApp extends StatelessWidget {
  const PaSrApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'PaSr - Local Marketplace',
      debugShowCheckedModeBanner: false,
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF1E3A8A)),
        textTheme: GoogleFonts.outfitTextTheme(Theme.of(context).textTheme),
        useMaterial3: true,
        scaffoldBackgroundColor: const Color(0xFFF9FAFB),
      ),
      home: const _SplashRouter(),
    );
  }
}

// Decide whether to show HomePage (logged in) or HomePage with Login/Signup buttons
class _SplashRouter extends StatefulWidget {
  const _SplashRouter();
  @override
  State<_SplashRouter> createState() => _SplashRouterState();
}

class _SplashRouterState extends State<_SplashRouter> {
  @override
  void initState() {
    super.initState();
    // Always start on HomePage — it shows Login/SignUp buttons in header if needed
    // This avoids a blocking auth check before the UI is shown
  }

  @override
  Widget build(BuildContext context) => const HomePage();
}
