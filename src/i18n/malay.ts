export type Language = "en" | "ms";

const ms: Record<string, string> = {
  "AI health companion": "Pembantu kesihatan AI",
  Home: "Utama",
  "Health Summary": "Ringkasan Kesihatan",
  "AI Assistant": "Pembantu AI",
  "Possible Risks": "Risiko Berkemungkinan",
  "Test Results": "Keputusan Ujian",
  Profile: "Profil",
  "PATIENT PORTAL": "PORTAL PESAKIT",
  Patient: "Pesakit",
  May: "Mei",
  Notifications: "Pemberitahuan",
  "Open menu": "Buka menu",
  "YOUR HEALTH, MADE CLEARER": "KESIHATAN ANDA, LEBIH MUDAH DIFAHAMI",
  "Feel informed at every step of your care.":
    "Fahami kesihatan anda pada setiap langkah rawatan.",
  "A calm, secure place to understand your results, prepare for appointments, and ask better questions.":
    "Ruang yang selamat dan mudah untuk memahami keputusan, bersedia bagi janji temu dan bertanya soalan yang tepat.",
  "Private & secure": "Peribadi dan selamat",
  "Built around your care": "Direka untuk penjagaan anda",
  "For educational support only. Always follow advice from your care team.":
    "Untuk maklumat pendidikan sahaja. Sentiasa ikuti nasihat pasukan penjagaan anda.",
  "WELCOME BACK": "SELAMAT KEMBALI",
  "Sign in to your account": "Log masuk ke akaun anda",
  "Understand your health. Ask questions. Stay informed.":
    "Fahami kesihatan anda. Tanya soalan. Dapatkan maklumat.",
  "Email or patient ID": "E-mel atau ID pesakit",
  Password: "Kata laluan",
  "Remember me": "Ingat saya",
  "Forgot password?": "Lupa kata laluan?",
  "Sign in securely": "Log masuk dengan selamat",
  "Need help?": "Perlukan bantuan?",
  "Contact your clinic": "Hubungi klinik anda",
  "Contact your care team for support.":
    "Hubungi pasukan penjagaan anda untuk bantuan.",
  "Contact clinic": "Hubungi klinik",
  "SATURDAY, 1 AUGUST 2026": "SABTU, 1 OGOS 2026",
  "Good morning, Sarah": "Selamat pagi, Sarah",
  "Here’s a clear look at how you’re doing today.":
    "Berikut ialah gambaran ringkas kesihatan anda hari ini.",
  "Ask your health assistant": "Tanya pembantu kesihatan anda",
  "YOUR HEALTH AT A GLANCE": "RINGKASAN KESIHATAN ANDA",
  "Your condition is currently stable.": "Keadaan anda kini stabil.",
  "Your latest results are within your usual range. Keep following your medication and care plan.":
    "Keputusan terkini anda berada dalam julat biasa. Teruskan ubat dan pelan penjagaan anda.",
  Stable: "Stabil",
  "This summary is for informational purposes and does not replace advice from your healthcare provider.":
    "Ringkasan ini untuk maklumat sahaja dan tidak menggantikan nasihat profesional kesihatan anda.",
  "Needs attention": "Perlu perhatian",
  "Slightly high": "Sedikit tinggi",
  Good: "Baik",
  "Low risk": "Risiko rendah",
  "Moderate risk": "Risiko sederhana",
  "High risk": "Risiko tinggi",
  "Calculated live": "Dikira secara langsung",
  "Target: below 7.0%": "Sasaran: bawah 7.0%",
  "Target: 4.4–7.0": "Sasaran: 4.4–7.0",
  "Target: below 130/80": "Sasaran: bawah 130/80",
  "Healthy: above 60": "Sihat: melebihi 60",
  "Random Forest estimate": "Anggaran Random Forest",
  HbA1c: "HbA1c",
  "Fasting glucose": "Glukosa puasa",
  "Blood pressure": "Tekanan darah",
  "Kidney function": "Fungsi buah pinggang",
  "Nephropathy risk": "Risiko nefropati",
  "Neuropathy risk": "Risiko neuropati",
  "Your average blood sugar over 2–3 months.":
    "Purata gula darah anda sepanjang 2–3 bulan.",
  "Your blood sugar after not eating overnight.":
    "Paras gula darah selepas berpuasa semalaman.",
  "Close to your recommended personal target.":
    "Hampir kepada sasaran peribadi yang disyorkan.",
  "Your kidneys are filtering blood well.":
    "Buah pinggang anda menapis darah dengan baik.",
  "Calculated automatically using the fitted nephropathy model.":
    "Dikira secara automatik menggunakan model nefropati yang telah dilatih.",
  "Calculated automatically using the fitted neuropathy model.":
    "Dikira secara automatik menggunakan model neuropati yang telah dilatih.",
  "FROM YOUR CLINICAL NOTES": "DARIPADA NOTA KLINIKAL ANDA",
  "Recent health summary": "Ringkasan kesihatan terkini",
  "“Your blood sugar control has improved slightly since your previous appointment. Your kidney function is currently stable.”":
    "“Kawalan gula darah anda bertambah baik sedikit sejak janji temu sebelumnya. Fungsi buah pinggang anda kini stabil.”",
  "Continue taking your prescribed medication and be mindful of carbohydrate portions.":
    "Teruskan mengambil ubat seperti yang ditetapkan dan awasi saiz hidangan karbohidrat.",
  "View full summary": "Lihat ringkasan penuh",
  "Ask AI about this": "Tanya AI tentang ini",
  "6-MONTH TREND": "TREND 6 BULAN",
  "HbA1c is moving down": "HbA1c semakin menurun",
  Improving: "Bertambah baik",
  "Your latest reading is 0.4% lower than February.":
    "Bacaan terkini anda 0.4% lebih rendah berbanding Februari.",
  "CARE PLAN": "PELAN PENJAGAAN",
  "Your next steps": "Langkah seterusnya",
  "View care plan →": "Lihat pelan penjagaan →",
  "Take your medication": "Ambil ubat anda",
  "Metformin 500 mg · Twice daily": "Metformin 500 mg · Dua kali sehari",
  "Complete your blood test": "Lengkapkan ujian darah",
  "Due before 15 August": "Perlu dibuat sebelum 15 Ogos",
  "Attend your appointment": "Hadir janji temu",
  "Know low sugar signs": "Kenali tanda gula rendah",
  "Review the warning signs": "Semak tanda amaran",
  "UPCOMING APPOINTMENT": "JANJI TEMU AKAN DATANG",
  "Diabetes follow-up": "Susulan diabetes",
  "Diabetes Clinic": "Klinik Diabetes",
  "View details": "Lihat butiran",
  "LAST UPDATED 28 JULY 2026": "KEMAS KINI TERAKHIR 28 JULAI 2026",
  "Your Clinical Notes, Explained Simply":
    "Nota Klinikal Anda, Diterangkan Dengan Mudah",
  "A patient-friendly explanation of your latest visit with Dr. Lim.":
    "Penerangan mesra pesakit tentang lawatan terkini anda bersama Dr. Lim.",
  "View original notes": "Lihat nota asal",
  "Hide original notes": "Sembunyikan nota asal",
  "AI-generated summaries may contain errors. Please verify important information with your healthcare provider.":
    "Ringkasan yang dijana AI mungkin mengandungi kesilapan. Sahkan maklumat penting dengan profesional kesihatan anda.",
  "ORIGINAL CLINICAL NOTES": "NOTA KLINIKAL ASAL",
  "Current condition": "Keadaan semasa",
  "Kidney health": "Kesihatan buah pinggang",
  Medication: "Ubat-ubatan",
  "Important blood test findings": "Dapatan penting ujian darah",
  "Recommended actions": "Tindakan yang disyorkan",
  "Warning signs to monitor": "Tanda amaran untuk dipantau",
  "Upcoming care": "Penjagaan akan datang",
  "Have a question?": "Ada soalan?",
  "Ask the health assistant to explain any part of your summary in simpler words.":
    "Minta pembantu kesihatan menerangkan mana-mana bahagian ringkasan anda dengan bahasa lebih mudah.",
  "Ask AI about this summary": "Tanya AI tentang ringkasan ini",
  "YOUR CARE TEAM": "PASUKAN PENJAGAAN ANDA",
  "View clinic details →": "Lihat butiran klinik →",
  "GROQ · LLAMA 3.3 70B": "GROQ · LLAMA 3.3 70B",
  "AI Health Assistant": "Pembantu Kesihatan AI",
  "Ask questions about your diabetes, results, and care plan.":
    "Tanya tentang diabetes, keputusan ujian dan pelan penjagaan anda.",
  "Clear conversation": "Kosongkan perbualan",
  "This AI provides general educational information. It does not diagnose, prescribe treatment, or replace your doctor.":
    "AI ini memberikan maklumat pendidikan umum. Ia tidak membuat diagnosis, menetapkan rawatan atau menggantikan doktor anda.",
  "Care Assistant": "Pembantu Penjagaan",
  "Powered by Llama 3.3 70B": "Dikuasakan oleh Llama 3.3 70B",
  "Ask about your health records…": "Tanya tentang rekod kesihatan anda…",
  Message: "Mesej",
  "Send message": "Hantar mesej",
  "New conversation": "Perbualan baharu",
  Now: "Sekarang",
  "AI can make mistakes. Check important information with your care team.":
    "AI boleh melakukan kesilapan. Sahkan maklumat penting dengan pasukan penjagaan anda.",
  "Hello Sarah — I can help explain your diabetes results and care plan in clear, everyday language. What would you like to understand?":
    "Hai Sarah — saya boleh membantu menerangkan keputusan diabetes dan pelan penjagaan anda dalam bahasa yang mudah. Apakah yang ingin anda fahami?",
  "AUTOMATIC COMPLICATION ESTIMATES": "ANGGARAN KOMPLIKASI AUTOMATIK",
  "Two Random Forest models calculate possible diabetes-related complication risks from your latest record.":
    "Dua model Random Forest menganggarkan risiko komplikasi berkaitan diabetes berdasarkan rekod terkini anda.",
  "Random Forest only": "Random Forest sahaja",
  "These probabilities are model estimates, not diagnoses. They should be reviewed by a qualified healthcare professional.":
    "Kebarangkalian ini ialah anggaran model, bukan diagnosis. Ia perlu disemak oleh profesional kesihatan yang berkelayakan.",
  "Calculating possible risks…": "Sedang mengira risiko…",
  "Loading both fitted Random Forest models. No manual input is needed.":
    "Sedang memuatkan kedua-dua model Random Forest terlatih. Tiada input manual diperlukan.",
  "RANDOM FOREST ESTIMATE": "ANGGARAN RANDOM FOREST",
  "Risk progression": "Tahap risiko",
  "estimated probability": "kebarangkalian anggaran",
  "Nephropathy is kidney damage that can develop when diabetes affects the kidneys’ tiny blood-filtering vessels.":
    "Nefropati ialah kerosakan buah pinggang yang boleh berlaku apabila diabetes menjejaskan salur darah halus yang menapis darah.",
  "Neuropathy is nerve damage that can cause tingling, burning, pain, or numbness, especially in the feet and legs.":
    "Neuropati ialah kerosakan saraf yang boleh menyebabkan rasa mencucuk, panas, sakit atau kebas, terutamanya pada kaki.",
  "Information used by the model": "Maklumat yang digunakan oleh model",
  "Recommended next step": "Langkah seterusnya yang disyorkan",
  "Blood test record · 28 July 2026": "Rekod ujian darah · 28 Julai 2026",
  "Model test accuracy": "Ketepatan ujian model",
  "Model ROC-AUC": "ROC-AUC model",
  "0% · Low": "0% · Rendah",
  "30% · Moderate": "30% · Sederhana",
  "60% · High": "60% · Tinggi",
  "LATEST PANEL · 28 JULY 2026": "PANEL TERKINI · 28 JULAI 2026",
  "Blood Test Results": "Keputusan Ujian Darah",
  "Your lab results, explained in patient-friendly language.":
    "Keputusan makmal anda diterangkan dalam bahasa yang mudah difahami.",
  "Download report": "Muat turun laporan",
  "Latest results": "Keputusan terkini",
  "Abnormal results": "Keputusan tidak normal",
  "Diabetes-related": "Berkaitan diabetes",
  "Kidney-related": "Berkaitan buah pinggang",
  Test: "Ujian",
  Result: "Keputusan",
  "Reference range": "Julat rujukan",
  Status: "Status",
  Date: "Tarikh",
  "RESULT EXPLAINED": "PENERANGAN KEPUTUSAN",
  "One result alone does not tell the full story. Your doctor will consider this alongside your overall health.":
    "Satu keputusan sahaja tidak memberikan gambaran menyeluruh. Doktor akan menilainya bersama keadaan kesihatan anda.",
  "Fasting blood glucose": "Glukosa darah puasa",
  "Serum creatinine": "Kreatinin serum",
  "Blood urea": "Urea darah",
  Potassium: "Kalium",
  Haemoglobin: "Hemoglobin",
  Normal: "Normal",
  High: "Tinggi",
  Kidney: "Buah pinggang",
  General: "Umum",
  Diabetes: "Diabetes",
  "Slightly above": "Sedikit melebihi sasaran",
  "ACCOUNT & PREFERENCES": "AKAUN DAN KEUTAMAAN",
  "Profile and Settings": "Profil dan Tetapan",
  "Manage your personal details and how CareLink works for you.":
    "Urus butiran peribadi dan tetapan CareLink anda.",
  "Patient ID": "ID pesakit",
  "Type 2 diabetes": "Diabetes jenis 2",
  "Date of birth": "Tarikh lahir",
  Contact: "Nombor telefon",
  "Preferred language": "Bahasa pilihan",
  English: "Bahasa Inggeris",
  "Edit personal details": "Sunting butiran peribadi",
  "Care information": "Maklumat penjagaan",
  "Primary doctor": "Doktor utama",
  Clinic: "Klinik",
  "Emergency contact": "Hubungan kecemasan",
  Spouse: "Pasangan",
  Manage: "Urus",
  View: "Lihat",
  Edit: "Sunting",
  "Accessibility & appearance": "Kebolehcapaian dan paparan",
  "Larger text": "Teks lebih besar",
  "Increase text throughout the portal": "Besarkan teks di seluruh portal",
  "Dark mode": "Mod gelap",
  "Reduce brightness in low light": "Kurangkan kecerahan dalam cahaya malap",
  "Appointments and test reminders": "Peringatan janji temu dan ujian",
  "Your privacy matters": "Privasi anda penting",
  "Your health information is only shown within this private patient portal. Mock data is used in this prototype.":
    "Maklumat kesihatan anda hanya dipaparkan dalam portal pesakit peribadi ini. Data contoh digunakan dalam prototaip ini.",
  "Read privacy information →": "Baca maklumat privasi →",
  "Sign out of CareLink": "Log keluar daripada CareLink",
};

Object.assign(ms, {
  "Your diabetes is moderately controlled. Your latest HbA1c is slightly above your recommended target, but it has improved since your previous visit.":
    "Diabetes anda terkawal pada tahap sederhana. HbA1c terkini sedikit melebihi sasaran yang disyorkan, tetapi telah bertambah baik sejak lawatan sebelumnya.",
  "Your kidney function is currently within a healthy range. Regular monitoring remains important because diabetes can affect the kidneys over time.":
    "Fungsi buah pinggang anda kini dalam julat yang sihat. Pemantauan berkala tetap penting kerana diabetes boleh menjejaskan buah pinggang dari semasa ke semasa.",
  "Continue taking Metformin 500 mg twice daily as prescribed. Do not stop or change medication without speaking to your doctor.":
    "Teruskan Metformin 500 mg dua kali sehari seperti yang ditetapkan. Jangan berhenti atau menukar ubat tanpa berbincang dengan doktor.",
  "Your HbA1c decreased from 7.5% to 7.1%. Your eGFR and creatinine results suggest that kidney function is stable.":
    "HbA1c anda menurun daripada 7.5% kepada 7.1%. Keputusan eGFR dan kreatinin menunjukkan fungsi buah pinggang yang stabil.",
  "Small, consistent actions can help you stay on track.":
    "Langkah kecil yang dilakukan secara konsisten dapat membantu anda kekal pada landasan.",
  "Reduce sugary drinks": "Kurangkan minuman bergula",
  "Take medication consistently": "Ambil ubat secara konsisten",
  "Monitor blood glucose": "Pantau glukosa darah",
  "Complete your next blood test": "Lengkapkan ujian darah seterusnya",
  "Attend your next appointment": "Hadir janji temu seterusnya",
  "Get medical advice for repeated very high or low readings. Seek urgent help for chest pain, confusion, fainting, seizures, or severe breathing difficulty.":
    "Dapatkan nasihat perubatan jika bacaan terlalu tinggi atau rendah berulang kali. Dapatkan bantuan kecemasan jika mengalami sakit dada, kekeliruan, pengsan, sawan atau kesukaran bernafas yang teruk.",
  "Complete your next blood test before 15 August. Your follow-up appointment is on 20 August 2026 at 10:30 AM.":
    "Lengkapkan ujian darah seterusnya sebelum 15 Ogos. Janji temu susulan anda ialah pada 20 Ogos 2026, jam 10:30 pagi.",
  "What does my HbA1c result mean?": "Apakah maksud keputusan HbA1c saya?",
  "Is my kidney function normal?": "Adakah fungsi buah pinggang saya normal?",
  "What foods can affect my blood sugar?":
    "Makanan apakah yang boleh mempengaruhi gula darah saya?",
  "What should I ask my doctor?":
    "Apakah yang patut saya tanyakan kepada doktor?",
  "Explain my latest health summary":
    "Terangkan ringkasan kesihatan terkini saya",
  "What are symptoms of low blood sugar?": "Apakah gejala gula darah rendah?",
  "What is my exact diagnosis, and what does it mean?":
    "Apakah diagnosis saya dan apakah maksudnya?",
  "What caused this condition, and are there other possible causes?":
    "Apakah punca keadaan ini dan adakah punca lain yang mungkin?",
  "Is it contagious? Could it affect other parts of my body?":
    "Adakah ia berjangkit? Bolehkah ia menjejaskan bahagian badan yang lain?",
  "What is the long-term outlook, and what are the possible complications?":
    "Apakah jangkaan jangka panjang dan komplikasi yang mungkin berlaku?",
  "What are my treatment options, and what are the pros and cons?":
    "Apakah pilihan rawatan saya serta manfaat dan risikonya?",
  "What are the possible side effects, and how can I manage them?":
    "Apakah kesan sampingan yang mungkin berlaku dan bagaimana saya boleh menanganinya?",
  "The fitted Random Forest estimates a 34.9% probability of nephropathy for the available patient record. This is a model estimate, not a diagnosis.":
    "Model Random Forest terlatih menganggarkan kebarangkalian nefropati sebanyak 34.9% berdasarkan rekod pesakit yang tersedia. Ini ialah anggaran model, bukan diagnosis.",
  "The fitted Random Forest estimates a 56% probability of neuropathy for the available patient record. This is a model estimate, not a diagnosis.":
    "Model Random Forest terlatih menganggarkan kebarangkalian neuropati sebanyak 56% berdasarkan rekod pesakit yang tersedia. Ini ialah anggaran model, bukan diagnosis.",
  "HbA1c and glucose measurements from the latest record":
    "Bacaan HbA1c dan glukosa daripada rekod terkini",
  "Blood pressure, age, BMI, and diabetes history":
    "Tekanan darah, umur, BMI dan sejarah diabetes",
  "Stored training medians for model fields not present in the current record":
    "Nilai median latihan bagi maklumat model yang tiada dalam rekod semasa",
  "Stored training medians for unavailable model fields":
    "Nilai median latihan bagi maklumat model yang tidak tersedia",
  "Discuss this estimate and your kidney test trends with your doctor.":
    "Bincangkan anggaran ini dan trend ujian buah pinggang anda dengan doktor.",
  "Discuss this estimate and any tingling, burning, numbness, pain, or loss of sensation with your doctor.":
    "Bincangkan anggaran ini serta sebarang rasa mencucuk, panas, kebas, sakit atau kehilangan deria dengan doktor.",
  "Do not change medication or care based on this result.":
    "Jangan ubah ubat atau penjagaan berdasarkan keputusan ini.",
  "HbA1c reflects your average blood glucose over approximately the previous two to three months.":
    "HbA1c menunjukkan purata glukosa darah anda sepanjang kira-kira dua hingga tiga bulan lalu.",
  "This measures glucose after you have not eaten for at least eight hours.":
    "Ujian ini mengukur glukosa selepas anda tidak makan sekurang-kurangnya lapan jam.",
  "Creatinine helps show how effectively your kidneys remove waste from your blood.":
    "Kreatinin membantu menunjukkan sejauh mana buah pinggang menyingkirkan bahan buangan daripada darah.",
  "eGFR estimates how well your kidneys filter your blood.":
    "eGFR menganggarkan keupayaan buah pinggang menapis darah.",
  "Urea is a waste product filtered from your blood by the kidneys.":
    "Urea ialah bahan buangan yang ditapis daripada darah oleh buah pinggang.",
  "Potassium supports healthy muscles, nerves and heart rhythm.":
    "Kalium menyokong fungsi otot, saraf dan rentak jantung yang sihat.",
  "Haemoglobin carries oxygen around your body.":
    "Hemoglobin membawa oksigen ke seluruh badan.",
  "Show password": "Tunjukkan kata laluan",
  "Hide password": "Sembunyikan kata laluan",
  "Switch to English": "Tukar kepada Bahasa Inggeris",
  "Tukar ke Bahasa Melayu": "Tukar kepada Bahasa Melayu",
});

Object.assign(ms, {
  "Wound Health Check": "Pemeriksaan Kesihatan Luka",
  "SKIN & WOUND MONITORING": "PEMANTAUAN KULIT DAN LUKA",
  "Record warning signs around a wound or affected skin area and save a photograph for your care history.": "Rekod tanda amaran di sekitar luka atau kawasan kulit yang terjejas dan simpan gambar dalam sejarah penjagaan anda.",
  "Is the wound or surrounding skin redder than usual?": "Adakah luka atau kulit di sekitarnya lebih merah daripada biasa?",
  "Is there new swelling around the wound or affected area?": "Adakah terdapat bengkak baharu di sekitar luka atau kawasan yang terjejas?",
  "Does the area feel unusually warm?": "Adakah kawasan tersebut terasa lebih panas daripada biasa?",
  "Look for new redness, spreading redness, or a noticeable change from your usual skin colour.": "Perhatikan kemerahan baharu, kemerahan yang merebak atau perubahan ketara daripada warna kulit biasa anda.",
  "Look for new puffiness, tight-looking skin, or a clear difference from the surrounding area.": "Perhatikan bengkak baharu, kulit yang kelihatan tegang atau perbezaan jelas daripada kawasan sekeliling.",
  "Compare it gently with nearby unaffected skin or the same area on the other side of your body. A photo cannot measure warmth.": "Bandingkan secara perlahan dengan kulit berdekatan yang tidak terjejas atau kawasan yang sama pada sebelah badan yang lain. Gambar tidak dapat mengukur suhu.",
  "Use good lighting and show the wound or affected area together with some surrounding skin. JPEG, PNG, or WebP; maximum 8 MB.": "Gunakan pencahayaan yang baik dan tunjukkan luka atau kawasan terjejas bersama sedikit kulit di sekelilingnya. JPEG, PNG atau WebP; maksimum 8 MB.",
  "Save wound health check": "Simpan pemeriksaan kesihatan luka",
  "No wound health checks saved yet.": "Belum ada pemeriksaan kesihatan luka yang disimpan.",
  "Keep a close eye on the affected area": "Pantau kawasan yang terjejas dengan teliti",
  "Foot Health Check": "Pemeriksaan Kesihatan Kaki",
  "NEUROPATHY SUPPORT": "SOKONGAN NEUROPATI",
  "Record visible or felt warning signs and save a photograph for your care history.": "Rekod tanda amaran yang dilihat atau dirasai dan simpan gambar dalam sejarah penjagaan anda.",
  "Check for warning signs": "Periksa tanda amaran",
  "Answer all three questions before adding a photograph.": "Jawab ketiga-tiga soalan sebelum menambah gambar.",
  "Does your foot look red?": "Adakah kaki anda kelihatan kemerahan?",
  "Does your foot look swollen?": "Adakah kaki anda kelihatan bengkak?",
  "Does your foot feel unusually warm?": "Adakah kaki anda terasa lebih panas daripada biasa?",
  "Look for new or spreading redness compared with your usual skin colour.": "Perhatikan kemerahan baharu atau yang merebak berbanding warna kulit biasa anda.",
  "Compare both feet and look for new puffiness or tight-looking skin.": "Bandingkan kedua-dua kaki dan perhatikan bengkak baharu atau kulit yang kelihatan tegang.",
  "Compare it gently with the other foot. A photo cannot measure warmth.": "Bandingkan dengan kaki sebelah secara perlahan. Gambar tidak dapat mengukur suhu.",
  Yes: "Ya", No: "Tidak",
  "Add a current photograph": "Tambah gambar terkini",
  "Use good lighting and show the whole affected foot. JPEG, PNG, or WebP; maximum 8 MB.": "Gunakan pencahayaan yang baik dan tunjukkan keseluruhan kaki yang terjejas. JPEG, PNG atau WebP; maksimum 8 MB.",
  "Use camera": "Gunakan kamera", "Upload image": "Muat naik gambar",
  "LIVE CAMERA": "KAMERA LANGSUNG",
  "Take a current photograph": "Ambil gambar semasa",
  "Close camera": "Tutup kamera",
  "Use good lighting and keep the wound or affected area clearly visible.": "Gunakan pencahayaan yang baik dan pastikan luka atau kawasan terjejas dapat dilihat dengan jelas.",
  Cancel: "Batal",
  "Capture photograph": "Ambil gambar",
  "Save foot health check": "Simpan pemeriksaan kaki", "Saving securely…": "Sedang disimpan dengan selamat…",
  "YOUR RECORDS": "REKOD ANDA", "Previous checks": "Pemeriksaan terdahulu", "No foot health checks saved yet.": "Belum ada pemeriksaan kesihatan kaki yang disimpan.",
  "Doctor’s attention advised": "Pemeriksaan doktor disyorkan", "Continue monitoring": "Teruskan pemantauan",
  "This needs a doctor’s attention": "Keadaan ini memerlukan perhatian doktor", "Keep a close eye on your foot": "Pantau kaki anda dengan teliti", "No warning signs reported": "Tiada tanda amaran dilaporkan",
  "Done": "Selesai",
});

export function translateToMalay(value: string) {
  const trimmed = value.trim();
  if (!trimmed) return value;
  let translated = ms[trimmed];
  if (!translated) {
    translated = trimmed
      .replace(/28 Jul 2026/g, "28 Jul 2026")
      .replace(/February/g, "Februari")
      .replace(/August/g, "Ogos")
      .replace(/Moderate risk/g, "Risiko sederhana")
      .replace(/Low risk/g, "Risiko rendah")
      .replace(/High risk/g, "Risiko tinggi");
  }
  const start = value.match(/^\s*/)?.[0] ?? "";
  const end = value.match(/\s*$/)?.[0] ?? "";
  return `${start}${translated}${end}`;
}

const originals = new WeakMap<Node, string>();

function translateElement(root: ParentNode, language: Language) {
  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT);
  let node: Node | null;
  while ((node = walker.nextNode())) {
    const parent = node.parentElement;
    if (!parent || parent.closest("script,style,.message-row.user,.original"))
      continue;
    if (!originals.has(node)) originals.set(node, node.nodeValue ?? "");
    const original = originals.get(node) ?? "";
    const next = language === "ms" ? translateToMalay(original) : original;
    if (node.nodeValue !== next) node.nodeValue = next;
  }
  root.querySelectorAll?.("[placeholder],[aria-label]").forEach((element) => {
    for (const attribute of ["placeholder", "aria-label"]) {
      const key = `data-i18n-${attribute}`;
      const current = element.getAttribute(attribute);
      if (current && !element.hasAttribute(key))
        element.setAttribute(key, current);
      const original = element.getAttribute(key);
      if (original)
        element.setAttribute(
          attribute,
          language === "ms" ? translateToMalay(original) : original,
        );
    }
  });
}

export function applyLanguage(language: Language) {
  document.documentElement.lang = language;
  translateElement(document.body, language);
  const observer = new MutationObserver((mutations) =>
    mutations.forEach((mutation) => {
      if (mutation.type === "characterData") {
        const node = mutation.target;
        const parent = node.parentElement;
        if (
          !parent ||
          parent.closest("script,style,.message-row.user,.original")
        )
          return;
        const current = node.nodeValue ?? "";
        const stored = originals.get(node);
        if (!stored || current !== translateToMalay(stored))
          originals.set(node, current);
        const original = originals.get(node) ?? current;
        const next = language === "ms" ? translateToMalay(original) : original;
        if (current !== next) node.nodeValue = next;
        return;
      }
      mutation.addedNodes.forEach((node) => {
        if (node.nodeType === Node.TEXT_NODE && node.parentElement) {
          if (!originals.has(node)) originals.set(node, node.nodeValue ?? "");
          const original = originals.get(node) ?? "";
          const next =
            language === "ms" ? translateToMalay(original) : original;
          if (node.nodeValue !== next) node.nodeValue = next;
        } else if (node instanceof Element) translateElement(node, language);
      });
    }),
  );
  observer.observe(document.body, {
    childList: true,
    characterData: true,
    subtree: true,
  });
  return () => observer.disconnect();
}
