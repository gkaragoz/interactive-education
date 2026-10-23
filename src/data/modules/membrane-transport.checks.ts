import type { CheckQuestion, PredictPrompt } from '../moduleTypes';
import { chk, pred } from './phase';

const D = 'difuzyon';
const K = 'kolaylastirilmis-difuzyon';
const O = 'ozmoz';
const A = 'aktif-tasima';
const E = 'endositoz-ekzositoz';

export const checks: CheckQuestion[] = [
  // --- basit difüzyon (44 s) ---
  chk(D, 'yon', 4, true, 'concept', 'Dışarıda çok, içeride az molekül var. Küçük bir molekül zardan geçerse hangi yöne daha sık gider?', ['Dışarıdan içeriye', 'İçeriden dışarıya', 'İki yöne de eşit sıklıkta', 'Hiçbir yöne gitmez'], 0, 'Moleküller rastgele hareket eder; çok olan tarafta daha fazla molekül olduğu için oradan az olan tarafa geçen sayı daha fazladır.'),
  chk(D, 'buyuk', 8, true, 'concept', 'Pembe büyük molekül neden zardan geçemiyor?', ['Zar lipitten yapılı olduğu için büyük ve yüklü molekülleri geçirmez', 'Çok küçük olduğu için', 'Zar hiçbir madde geçirmez', 'Sıcaklık düşük olduğu için'], 0, 'Lipit çift katman yağlı bir yapıdır: küçük, yüksüz moleküller geçer, büyük ya da yüklü moleküller geçemez (seçici geçirgenlik).'),
  chk(D, 'evre-1', 12, false, 'which-phase', 'Şu an hangi evredeyiz?', ['Net geçiş', 'Dinamik denge', 'Dengesiz başlangıç'], 0, 'Derişim farkı sürüyor ve çok olan taraftan az olan tarafa net geçiş var: bu evre net geçiştir.'),
  chk(D, 'denge-sayisi', 16, true, 'count', 'Toplam 48 molekül var. Denge kurulunca zarın her iki yanında yaklaşık kaçar molekül bulunur?', ['12', '24', '36', '48'], 1, 'Denge, iki tarafın derişiminin eşitlenmesidir: 48 molekül iki eşit hacme yaklaşık 24’er olarak dağılır.'),
  chk(D, 'hiz', 21, true, 'concept', 'Aradaki fark azaldıkça net geçiş hızı nasıl değişir?', ['Azalır', 'Artar', 'Değişmez'], 0, 'Net geçiş derişim farkıyla orantılıdır. Fark küçüldükçe iki yöndeki geçişler birbirine yaklaşır ve net geçiş azalır.'),
  chk(D, 'sirada', 27, true, 'what-next', 'Fark azalmaya devam ederse sırada ne olur?', ['Net geçiş sıfırlanır, denge kurulur', 'Moleküller hareketi tamamen bırakır', 'Moleküller yalnızca içeri girer', 'Zar kalınlaşır'], 0, 'Fark sıfıra yaklaşınca iki yöndeki geçişler eşitlenir; buna dinamik denge denir.'),
  chk(D, 'enerji', 31, true, 'concept', 'Basit difüzyonda hücre ATP harcar mı?', ['Hayır, moleküllerin kendi hareketi yeter', 'Evet, her geçiş için bir ATP', 'Yalnızca gece'], 0, 'Basit difüzyon pasif bir taşımadır; enerji kaynağı moleküllerin kendi ısı hareketidir.'),
  chk(D, 'denge-hareket', 36, true, 'concept', 'Dengeye ulaşılınca moleküllere ne olur?', ['Her iki yönde eşit sayıda geçmeye devam ederler', 'Hepsi durur', 'Hepsi dışarı çıkar', 'Hepsi içeri girer'], 0, 'Denge dinamiktir: hareket durmaz, yalnızca içeri geçenlerin sayısı dışarı geçenlere eşit olur.'),
  chk(D, 'evre-2', 38, false, 'which-phase', 'Şu an hangi evredeyiz?', ['Yavaşlama', 'Dinamik denge', 'Net geçiş'], 1, 'Sayılar eşitlendi ve net değişim kalmadı: dinamik denge.'),
  chk(D, 'sicaklik', 41, false, 'concept', 'Aşağıdakilerden hangisi difüzyonu hızlandırır?', ['Sıcaklığın artması', 'Sıcaklığın azalması', 'Derişim farkının azalması'], 0, 'Sıcaklık artınca moleküller daha hızlı hareket eder; çarpışma ve geçiş sayısı artar, difüzyon hızlanır.'),

  // --- kolaylaştırılmış difüzyon (48 s) ---
  chk(K, 'protein', 3, true, 'concept', 'Zardaki kanal ve taşıyıcı proteinler ne işe yarar?', ['Zarın lipit kısmından geçemeyen maddelerin geçmesine yardım eder', 'Zarı kalınlaştırır', 'ATP üretir', 'Hücreyi böler'], 0, 'İyonlar ve glikoz gibi büyük, kutuplu moleküller lipit kısımdan geçemez; bu proteinler onlara yol açar.'),
  chk(K, 'glikoz', 6, true, 'concept', 'Glikoz neden zardan tek başına geçemez?', ['Büyük ve kutuplu bir molekül olduğu için', 'Çok küçük olduğu için', 'Zar hiçbir madde geçirmediği için'], 0, 'Glikoz büyük ve su sever bir molekül olduğundan lipit çift katmanın yağlı iç kısmından geçemez; taşıyıcı protein gerekir.'),
  chk(K, 'atp', 10, true, 'concept', 'İyonlar kanaldan geçerken hücre ATP harcar mı?', ['Hayır, derişim farkı yeter', 'Evet, her iyon için bir ATP', 'Yalnızca sıcakta'], 0, 'Kanaldan geçiş pasif bir taşımadır; iyonlar derişim farkı yönünde kendiliğinden akar.'),
  chk(K, 'evre-1', 13, false, 'which-phase', 'Şu an hangi evredeyiz?', ['Kanal proteinler', 'Taşıyıcı proteinler', 'Doyma', 'Zardaki proteinler'], 0, 'İyonların kanal proteinlerden aktığı evredeyiz.'),
  chk(K, 'sayi', 17, true, 'count', 'Her taşıyıcı protein aynı anda en çok kaç glikoz molekülünü taşır?', ['1', '2', '3', '4'], 0, 'Taşıyıcı bir molekülü bağlar, şekil değiştirir ve bırakır; bu tur bitmeden başka molekül alamaz.'),
  chk(K, 'sirada', 24, true, 'what-next', 'Glikoz taşıyıcıya bağlandı. Sırada ne olur?', ['Taşıyıcı şekil değiştirir ve glikozu öbür yüze bırakır', 'Taşıyıcı zardan çıkar', 'Glikoz parçalanır', 'ATP bağlanır'], 0, 'Taşıyıcı şekil değiştirerek bağlanma yerini öbür yüze açar; molekül orada serbest kalır.'),
  chk(K, 'sinir', 28, false, 'concept', 'Taşıyıcı proteinler neden geçiş hızını sınırlar?', ['Sayıları sınırlıdır ve her biri bir seferde bir molekül taşır', 'ATP bittiği için', 'Zarı kalınlaştırdıkları için', 'Glikozu parçaladıkları için'], 0, 'Tüm taşıyıcılar meşgulse yeni moleküller bekler; bu yüzden hız bir üst sınıra ulaşır.'),
  chk(K, 'evre-2', 33, false, 'which-phase', 'Şu an hangi evredeyiz?', ['Kanal proteinler', 'Doyma', 'Taşıyıcı proteinler'], 1, 'Derişim arttı ama taşıyıcılar meşgul olduğundan hız artmıyor: doyma evresi.'),
  chk(K, 'doyma', 42, true, 'concept', 'Dışarıdaki glikoz derişimi çok artırılırsa geçiş hızı ne olur?', ['Belli bir noktadan sonra artmaz', 'Sınırsız artar', 'Sıfıra düşer'], 0, 'Taşıyıcı sayısı sınırlı olduğundan hız bir doyma düzeyine çıkar ve orada kalır.'),
  chk(K, 'fark', 46, false, 'concept', 'Kolaylaştırılmış difüzyon ile aktif taşımanın temel farkı nedir?', ['Aktif taşıma ATP harcar ve derişime karşı yapılabilir', 'Aralarında fark yoktur', 'Kolaylaştırılmış difüzyon ATP ister', 'Aktif taşımada protein bulunmaz'], 0, 'Kolaylaştırılmış difüzyon pasiftir ve derişim yönündedir; aktif taşıma ATP ile derişime karşı da yapılabilir.'),

  // --- ozmoz (54 s) ---
  chk(O, 'madde', 3, true, 'concept', 'Ozmoz hangi maddenin zardan geçişidir?', ['Suyun', 'Şekerin', 'Tuzun', 'Proteinin'], 0, 'Ozmoz, suyun seçici geçirgen zardan geçişidir; çözünmüş madde zarda kalır.'),
  chk(O, 'hipo', 9, true, 'what-next', 'Hayvan hücresi seyreltik bir çözeltiye (hipotonik) konuldu. Sırada ne olur?', ['Su içeri girer, hücre şişer', 'Su dışarı çıkar, hücre büzülür', 'Hiçbir değişiklik olmaz', 'Hücre ikiye bölünür'], 0, 'Hücre içi daha derişik olduğundan su içeri geçer ve hücre şişer.'),
  chk(O, 'evre-1', 14, false, 'which-phase', 'Şu an hangi ortamdayız?', ['Hipotonik ortam', 'İzotonik ortam', 'Hipertonik ortam'], 0, 'Dışarısı hücre içinden seyreltik ve su içeri giriyor: hipotonik ortam.'),
  chk(O, 'duvar', 17, true, 'concept', 'Bitki hücresi seyreltik ortamda neden patlamaz?', ['Hücre duvarı dışarıdan destekler', 'Zarı çok kalındır', 'Hiç su almaz', 'Suyu hemen boşaltır'], 0, 'Hücre duvarı şişmeyi sınırlar; içeride turgor basıncı oluşur ve hücre dolgun kalır.'),
  chk(O, 'izo', 24, true, 'concept', 'İzotonik ortamda su geçişi nasıldır?', ['İki yönde eşit sayıda; net değişim yok', 'Yalnızca içeri', 'Yalnızca dışarı', 'Hiç geçmez'], 0, 'İki tarafın derişimi eşit olduğunda su her iki yönde eşit sayıda geçer; hücre hacmi değişmez.'),
  chk(O, 'yon', 28, false, 'concept', 'Su net olarak hangi tarafa geçer?', ['Çözünen derişimi yüksek olan tarafa', 'Çözünen derişimi düşük olan tarafa', 'Hacmi küçük olan tarafa', 'Sıcak olan tarafa'], 0, 'Çözünen derişimi yüksek tarafta serbest su daha azdır; su az olan tarafa doğru net olarak geçer.'),
  chk(O, 'plazmoliz', 34, true, 'what-next', 'Bitki hücresi derişik tuzlu suya konulursa ne olur?', ['Zar duvardan ayrılır (plazmoliz)', 'Hücre duvarı erir', 'Hücre patlar', 'Hacim aynı kalır'], 0, 'Su dışarı çıkar, protoplast küçülür ve hücre zarı duvardan ayrılır.'),
  chk(O, 'evre-2', 38, false, 'which-phase', 'Şu an hangi ortamdayız?', ['Hipotonik ortam', 'İzotonik ortam', 'Hipertonik ortam'], 2, 'Dışarısı hücre içinden derişik ve su dışarı çıkıyor: hipertonik ortam.'),
  chk(O, 'sogan', 41, true, 'concept', 'Salatada tuzlanan soğan neden suyunu bırakır?', ['Hücrelerden su dışarı çıkar', 'Tuz hücreye girip su üretir', 'Soğan erir', 'Isı açığa çıkar'], 0, 'Tuzlu ortam hipertoniktir; ozmozla hücrelerden su dışarı geçer.'),
  chk(O, 'karsi', 49, true, 'count', 'Gördüğün üç hücreden kaçının hacmi belirgin biçimde azaldı?', ['0', '1', '2', '3'], 1, 'Yalnızca hipertonik ortamdaki hücre su kaybetti ve küçüldü; öbürleri şişti ya da aynı kaldı.'),
  chk(O, 'hemoliz', 52, false, 'concept', 'Kırmızı kan hücresi saf suya konulursa ne olur?', ['Su alıp şişer ve patlayabilir', 'Büzülür', 'Hiç değişmez'], 0, 'Saf su hücreye göre çok seyreltiktir (hipotonik); hücre su alır ve zarı dayanamazsa patlar.'),

  // --- aktif taşıma (46 s) ---
  chk(A, 'yon', 3, true, 'concept', 'Dışarıda Na⁺ çok, içeride az. Difüzyon Na⁺ iyonlarını hangi yöne taşırdı?', ['İçeri', 'Dışarı', 'Her yöne eşit', 'Hiçbir yöne'], 0, 'Difüzyon iyonları çok olan yerden az olan yere götürür, yani Na⁺’yı içeri.'),
  chk(A, 'enerji', 8, true, 'concept', 'Aktif taşıma neden enerji ister?', ['Madde derişimin yüksek olduğu tarafa doğru taşınır', 'Madde çok küçüktür', 'Zar çok kalındır', 'Su geçişi gerekir'], 0, 'Derişime karşı taşımak, “yokuş yukarı” itmek gibidir; bunun için ATP enerjisi gerekir.'),
  chk(A, 'sirada', 10, true, 'what-next', 'ATP pompaya bağlandı. Sırada ne olur?', ['ATP parçalanır ve pompa şekil değiştirir', 'Pompa zardan ayrılır', 'Na⁺ geri döner', 'ATP birikir'], 0, 'ATP, ADP ve fosfata ayrılır; açığa çıkan enerji pompanın şeklini değiştirir.'),
  chk(A, 'evre-1', 12, false, 'which-phase', 'Şu an hangi evredeyiz?', ['Şekil değişimi, Na⁺ dışarı', 'K⁺ alımı', 'Sonuç'], 0, 'Pompa dışa açılıp Na⁺ iyonlarını bırakıyor: şekil değişimi ve Na⁺ çıkışı.'),
  chk(A, 'na', 15, true, 'count', 'Pompa bir turda kaç Na⁺ iyonunu dışarı atar?', ['1', '2', '3', '4'], 2, 'Na⁺/K⁺ pompası her turda 3 Na⁺ dışarı, 2 K⁺ içeri taşır.'),
  chk(A, 'k', 19, true, 'count', 'Pompa bir turda kaç K⁺ iyonunu içeri alır?', ['1', '2', '3', '4'], 1, 'Her turda 2 K⁺ içeri alınır.'),
  chk(A, 'adp', 23, false, 'concept', 'ATP parçalanınca ne oluşur?', ['ADP ve fosfat', 'Glikoz', 'Yalnızca su', 'Oksijen'], 0, 'ATP’nin son fosfat bağı kırılır: ADP ve inorganik fosfat oluşur, enerji açığa çıkar.'),
  chk(A, 'fark', 29, true, 'concept', 'Pompalar çalıştıkça Na⁺ derişim farkı (içeri ve dışarı arasında) nasıl değişir?', ['Artar', 'Azalır', 'Değişmez'], 0, 'Na⁺ zaten çok olan dışarıya taşındığı için iki taraf arasındaki fark büyür.'),
  chk(A, 'evre-2', 36, false, 'which-phase', 'Şu an hangi evredeyiz?', ['Derişime karşı', 'Döngü sürer', 'Sonuç'], 2, 'Pompaların turları bitti ve derişim farkı arttı: sonuç evresi.'),
  chk(A, 'tur', 41, true, 'concept', 'Aşağıdakilerden hangisi derişime karşı yapılır?', ['Aktif taşıma', 'Basit difüzyon', 'Ozmoz', 'Kolaylaştırılmış difüzyon'], 0, 'Yalnızca aktif taşıma, ATP kullanarak maddeyi derişimin yüksek olduğu tarafa taşıyabilir.'),

  // --- endositoz ve ekzositoz (56 s) ---
  chk(E, 'giris', 3, true, 'concept', 'Zardan geçemeyecek kadar büyük bir parçacığı hücre nasıl içeri alır?', ['Zarı çukurlaştırıp kesecikle sararak (endositoz)', 'Kanal proteiniyle', 'Basit difüzyonla', 'Ozmozla'], 0, 'Büyük parçacıklar endositozla kesecik içinde içeri alınır.'),
  chk(E, 'sirada-1', 8, true, 'what-next', 'Parçacık zara değdi. Sırada ne olur?', ['Zar parçacığın çevresini sarar', 'Parçacık zardan geçer', 'Parçacık erir', 'Zar çözülür'], 0, 'Zar parçacığın çevresine uzanıp onu sarar ve kenarlar birleşir.'),
  chk(E, 'evre-1', 13, false, 'which-phase', 'Şu an hangi evredeyiz?', ['Fagositoz', 'Pinositoz', 'Ekzositoz'], 0, 'Katı bir parçacık sarılıyor: fagositoz.'),
  chk(E, 'fark', 17, true, 'concept', 'Fagositoz ile pinositoz arasındaki fark nedir?', ['Fagositozda katı parçacık, pinositozda sıvı damlacıkları alınır', 'Fagositoz enerji harcamaz', 'Pinositoz yalnızca bitkide olur', 'Fark yoktur'], 0, 'İkisi de endositozdur: fagositoz “hücrenin yemesi”, pinositoz “hücrenin içmesi” gibidir.'),
  chk(E, 'atp', 21, true, 'concept', 'Endositoz ATP (enerji) gerektirir mi?', ['Evet', 'Hayır', 'Yalnızca pinositoz'], 0, 'Zarın şekil değiştirmesi ve kesecik oluşması enerji ister; endositoz aktif bir taşımadır.'),
  chk(E, 'zar', 27, false, 'concept', 'Endositozda zarın çukurlaşan kısmı ne olur?', ['Veziküle ait zar olur', 'Yok olur', 'Hücre duvarına eklenir'], 0, 'Zarın o parçası ayrılarak veziküle dönüşür; vezikül zarı yine lipit çift katmandır.'),
  chk(E, 'kaynasma', 33, true, 'concept', 'Ekzositozda vezikül nereye kaynaşır?', ['Hücre zarına', 'Çekirdeğe', 'Mitokondriye'], 0, 'Vezikül hücre zarına kaynaşır ve içeriğini dışarı boşaltır.'),
  chk(E, 'sirada-2', 38, true, 'what-next', 'Vezikül zarla kaynaştı. Sırada ne olur?', ['İçindeki madde hücre dışına boşalır', 'Vezikül küçülür', 'Zar yırtılır'], 0, 'Kaynaşma yerinde açılan gözenekten içerik dışarı salınır.'),
  chk(E, 'evre-2', 41, false, 'which-phase', 'Şu an hangi evredeyiz?', ['Pinositoz', 'Fagositoz', 'Ekzositoz'], 2, 'Vezikül zara kaynaşıp içeriğini boşaltıyor: ekzositoz.'),
  chk(E, 'ornek', 49, true, 'concept', 'Aşağıdakilerden hangisi ekzositoza örnektir?', ['Salgı hücresinin sindirim enzimi vermesi', 'Akyuvarın bakteri yutması', 'Suyun hücreye girmesi', 'Oksijenin zardan geçmesi'], 0, 'Enzimler ve hormonlar keseciklerle zara taşınıp ekzositozla dışarı verilir.'),
  chk(E, 'alan', 53, false, 'concept', 'Ekzositozda veziküle ait zara ne olur?', ['Hücre zarına katılır', 'Hücre içinde kalır', 'Eriyip kaybolur'], 0, 'Vezikül zarı hücre zarıyla birleşir; bu yüzden endositozda ayrılan zar geri kazanılır.'),
];

export const predicts: PredictPrompt[] = [
  pred(D, 5.5, true, 'Sence moleküller zardan hangi yöne daha çok geçecek?', 'Çok olan dışarıdan az olan içeriye doğru daha çok molekül geçecek; çünkü dışarıda geçmeye hazır daha çok molekül var.'),
  pred(D, 20, true, 'Fark azaldı. Sence net geçiş hızı ne olacak?', 'Net geçiş hızı düşecek ve sonunda sıfıra yaklaşacak.'),
  pred(D, 34, true, 'Sayılar eşitlendi. Sence moleküller geçmeyi bırakacak mı?', 'Hayır: moleküller iki yönde eşit sayıda geçmeye devam eder; net değişim olmaz.'),
  pred(K, 6.5, true, 'Sence kanal proteinlerden hangi parçacıklar geçecek?', 'Zarın lipit kısmından geçemeyen iyonlar, derişimi çok olan taraftan az olan tarafa doğru geçecek.'),
  pred(K, 31, true, 'Dışarıya daha çok glikoz eklenecek. Sence geçiş hızı çok mu artacak?', 'Hız bir noktaya kadar artar; taşıyıcıların hepsi meşgul olunca daha fazla artmaz (doyma).'),
  pred(K, 40, false, 'Taşıyıcı sayısı iki katına çıkarılsaydı doyma düzeyi ne olurdu?', 'Aynı anda daha çok molekül taşınabileceğinden doyma düzeyi yaklaşık iki katına çıkardı.'),
  pred(O, 5.5, true, 'Sence soldaki hücre (seyreltik ortam) ne olacak?', 'Su hücreye girecek; hayvan hücresi şişecek, bitki hücresi gerilecek.'),
  pred(O, 29.5, true, 'Sağdaki hücre derişik ortamda. Sence ne olacak?', 'Hücreden su dışarı çıkacak; hayvan hücresi büzülecek, bitki hücresinde zar duvardan ayrılacak.'),
  pred(O, 19.5, true, 'Ortadaki hücrenin ortamı hücreyle eşit derişimli. Sence boyutu değişecek mi?', 'Hayır: su iki yönde eşit geçtiği için hücre aynı boyutta kalacak.'),
  pred(A, 6.5, true, 'Sence pompa Na⁺ iyonlarını hangi yöne taşıyacak?', 'Hücre dışına: yani Na⁺’nın zaten çok olduğu tarafa, bu yüzden enerji (ATP) gerekir.'),
  pred(A, 10.5, true, 'ATP bağlandı. Sence ATP’ye ne olacak?', 'ATP parçalanıp ADP ve fosfat verecek; açığa çıkan enerji pompayı şekil değiştirtecek.'),
  pred(A, 30, false, 'Pompalar çalışmaya devam ederse hücre içindeki Na⁺ sayısı nasıl değişir?', 'Azalmaya devam eder; her turda 3 Na⁺ dışarı atıldığı için dışarıdaki Na⁺ derişimi daha da artar.'),
  pred(E, 4.5, true, 'Sence büyük parçacık hücreye nasıl girecek?', 'Zar parçacığı sarıp kesecik oluşturacak; parçacık zarı geçmeyecek, kesecik içinde alınacak.'),
  pred(E, 29, true, 'Sence hücre içindeki dolu kesecik ne yapacak?', 'Zara yaklaşıp kaynaşacak ve içindekini dışarı boşaltacak (ekzositoz).'),
  pred(E, 45, false, 'Kesecik zarla kaynaştıktan sonra veziküle ait zara ne olur?', 'Hücre zarının parçası olur; endositozda ayrılan zar böylece geri kazanılır.'),
];
