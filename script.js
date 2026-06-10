document.addEventListener('DOMContentLoaded', () => {
    
    // سحب قاعدة بيانات الفواتير المحفوظة محلياً
    let invoices = JSON.parse(localStorage.getItem('free_sys_invoices')) || [];
    
    // مصفوفة مؤقتة للاحتفاظ بالفواتير المفلترة الحالية لتسهيل عملية الدمج
    let currentFilteredInvoices = [];

    // نظام التبديل بين الشاشات العلوية
    const tabButtons = document.querySelectorAll('.tab-btn');
    const tabContents = document.querySelectorAll('.tab-content');

    tabButtons.forEach(btn => {
        btn.addEventListener('click', () => {
            tabButtons.forEach(b => b.classList.remove('active'));
            tabContents.forEach(c => c.classList.remove('active'));
            
            btn.classList.add('active');
            document.getElementById(btn.dataset.tab).classList.add('active');
            initSystem();
        });
    });

    function initSystem() {
        filterInvoices(); // يضمن تفعيل الفلترة وعرض الجدول المحدث فوراً
        updateStats();
    }

    // ================= [ حفظ الفاتورة الحرة الجديدة ] =================
    const invoiceForm = document.getElementById('invoice-form');
    if(invoiceForm) {
        invoiceForm.addEventListener('submit', (e) => {
            e.preventDefault();

            const price = parseFloat(document.getElementById('inv-price').value);
            const qty = parseInt(document.getElementById('inv-qty').value);
            const notes = document.getElementById('inv-notes').value || "لا توجد ملاحظات";
            
            // معالجة التاريخ المدخل يدوياً
            const inputDate = document.getElementById('inv-date').value;
            let finalDate = "";
            
            if (inputDate) {
                const dateObj = new Date(inputDate);
                finalDate = dateObj.toLocaleDateString('ar-EG', { year:'numeric', month:'short', day:'numeric' });
            } else {
                finalDate = new Date().toLocaleDateString('ar-EG', { year:'numeric', month:'short', day:'numeric' });
            }

            const newInvoice = {
                id: Math.floor(100000 + Math.random() * 900000), 
                date: finalDate,
                customer: document.getElementById('inv-customer').value.trim(),
                product: document.getElementById('inv-product').value,
                price: price,
                qty: qty,
                payment: document.getElementById('inv-payment').value,
                notes: notes,
                total: price * qty
            };

            invoices.unshift(newInvoice);
            localStorage.setItem('free_sys_invoices', JSON.stringify(invoices));
            
            invoiceForm.reset();
            initSystem();
            alert(`🎉 تم حفظ الفاتورة بنجاح برقم (#${newInvoice.id}) وتاريخ (${finalDate})!`);
        });
    }

    // ================= [ عرض وتصفية الفواتير في الأرشيف ] =================
    function renderInvoicesTable(filteredInvoices = invoices) {
        const tbody = document.getElementById('invoices-table-body');
        tbody.innerHTML = '';

        if(filteredInvoices.length === 0) {
            tbody.innerHTML = `<tr><td colspan="9" style="text-align:center; color:#64748b;">لا توجد فواتير مطابقة للبحث حالياً</td></tr>`;
            return;
        }

        filteredInvoices.forEach(inv => {
            const tr = document.createElement('tr');
            tr.innerHTML = `
                <td>#${inv.id}</td>
                <td>${inv.date}</td>
                <td><b>${inv.customer}</b></td>
                <td><span class="badge-prod">${inv.product}</span></td>
                <td>${inv.qty}</td>
                <td>${inv.payment}</td>
                <td class="text-green">$${inv.total.toLocaleString()}</td>
                <td><div class="note-text" title="${inv.notes}">${inv.notes}</div></td>
                <td>
                    <button class="btn-whatsapp" onclick="shareOnWhatsApp(${inv.id})"><i class="fab fa-whatsapp"></i> واتساب</button>
                    <button class="btn-delete" onclick="deleteInvoice(${inv.id})"><i class="fas fa-trash"></i></button>
                </td>
            `;
            tbody.appendChild(tr);
        });
    }

    // محرك الفلترة اللحظية والتحكم في ظهور زر الدمج
    const searchCust = document.getElementById('search-customer');
    const searchProd = document.getElementById('search-product');
    const filterPay = document.getElementById('filter-payment');
    const mergeContainer = document.getElementById('merge-action-container');
    const mergeCountSpan = document.getElementById('merge-count');

    function filterInvoices() {
        const cText = searchCust ? searchCust.value.toLowerCase().trim() : "";
        const pText = searchProd ? searchProd.value.toLowerCase() : "";
        const payType = filterPay ? filterPay.value : "all";

        currentFilteredInvoices = invoices.filter(inv => {
            return inv.customer.toLowerCase().includes(cText) &&
                   inv.product.toLowerCase().includes(pText) &&
                   (payType === 'all' || inv.payment === payType);
        });

        // ميزة الدمج الذكي: يظهر زر الدمج فقط إذا قام المستخدم بكتابة اسم العميل وكان هناك أكثر من فاتورة واحدة له
        if(cText.length >= 2 && currentFilteredInvoices.length > 1) {
            mergeContainer.style.display = 'block';
            mergeCountSpan.textContent = currentFilteredInvoices.length;
        } else {
            mergeContainer.style.display = 'none';
        }

        renderInvoicesTable(currentFilteredInvoices);
    }

    if(searchCust) searchCust.addEventListener('input', filterInvoices);
    if(searchProd) searchProd.addEventListener('input', filterInvoices);
    if(filterPay) filterPay.addEventListener('change', filterInvoices);

    // ================= [ ميزة دمج وإرسال كشف حساب موحد للعميل ] =================
    const btnMerge = document.getElementById('btn-merge-invoices');
    if(btnMerge) {
        btnMerge.addEventListener('click', () => {
            if(currentFilteredInvoices.length === 0) return;

            // أخذ اسم العميل من أول فاتورة في التصفية
            const customerName = currentFilteredInvoices[0].customer;
            let totalStatementSum = 0;
            let itemsDetailsText = "";

            // تجميع عناصر الفواتير وحساب مجاميعها بالكامل
            currentFilteredInvoices.forEach((inv, index) => {
                totalStatementSum += inv.total;
                itemsDetailsText += `${index + 1}. 📄 فاتورة #${inv.id} (${inv.date})\n   🔹 *الصنف:* ${inv.product}\n   🔹 *الكمية:* ${inv.qty} | *الحساب:* $${inv.total.toLocaleString()}\n   🔹 *ملاحظات:* _${inv.notes}_\n\n`;
            });

            // صياغة كشف الحساب المدمج بشكل فائق التنظيم للواتساب
            const messageText = 
`🧾 *فاتورة مبيعات إلكترونية -  مركز خان شيخون* 🧾
📊 *كشف حساب مدمج وكافة الفواتير* 📊
----------------------------------------
*السيد/ة:* ${customerName}
*عدد الفواتير المدمجة:* ${currentFilteredInvoices.length} فواتير
*تفاصيل المسحوبات والمشتريات الحالية:*

${itemsDetailsText}----------------------------------------
💰 *إجمالي الحساب الختامي لكافة الفواتير:* *$${totalStatementSum.toLocaleString()}*

نشكركم لثقتكم الدائمة بمتجرنا 🙏🌸`;

            const encodedText = encodeURIComponent(messageText);
            const whatsappURL = `https://api.whatsapp.com/send?text=${encodedText}`;
            window.open(whatsappURL, '_blank');
        });
    }

    // ================= [ مشاركة فاتورة منفردة عبر WhatsApp ] =================
    window.shareOnWhatsApp = function(id) {
        const inv = invoices.find(i => i.id === id);
        if(!inv) return;

        const messageText = 
`🧾 *فاتورة مبيعات إلكترونية -  مركز خان شيخون* 🧾
----------------------------------------
*رقم الفاتورة:* #${inv.id}
*التاريخ:* ${inv.date}
*اسم العميل:* ${inv.customer}
*البيانات والمشتريات:*
 *نوع القطعة:* ${inv.product}
 *الكمية:* ${inv.qty}
 *طريقة الدفع:* ${inv.payment}
 *ملاحظات وشروط :*
_${inv.notes}_
----------------------------------------
 *الإجمالي الكلي الخاضع:* *$${inv.total.toLocaleString()}*

شكرًا لتعاملك معنا! وزيارتك تسرنا دائماً 🙏🌸`;

        const encodedText = encodeURIComponent(messageText);
        const whatsappURL = `https://api.whatsapp.com/send?text=${encodedText}`;
        window.open(whatsappURL, '_blank');
    };

    // دالة حذف فاتورة من النظام
    window.deleteInvoice = function(id) {
        if(confirm('هل تريد حذف هذه الفاتورة نهائياً؟')) {
            invoices = invoices.filter(inv => inv.id !== id);
            localStorage.setItem('free_sys_invoices', JSON.stringify(invoices));
            initSystem();
        }
    };

    // تحديث الإحصائيات المالية
    function updateStats() {
        const totalSales = invoices.reduce((sum, inv) => sum + inv.total, 0);
        document.getElementById('stat-sales').textContent = `$${totalSales.toLocaleString()}`;
        document.getElementById('stat-count').textContent = `${invoices.length} فاتورة`;
    }

    initSystem();
});