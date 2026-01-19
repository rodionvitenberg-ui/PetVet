import React from 'react';
import { Page, Text, View, Document, StyleSheet, Font } from '@react-pdf/renderer';

// Register fonts
Font.register({
  family: 'Roboto',
  fonts: [
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-regular-webfont.ttf', fontWeight: 400 },
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-bold-webfont.ttf', fontWeight: 700 },
  ],
});

const styles = StyleSheet.create({
  page: { flexDirection: 'column', backgroundColor: '#FFFFFF', padding: 40, fontFamily: 'Roboto', fontSize: 10, color: '#374151' },
  
  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30, paddingBottom: 20, borderBottomWidth: 1, borderBottomColor: '#E5E7EB' },
  logo: { fontSize: 20, fontWeight: 700, color: '#2563EB', marginBottom: 4 },
  companyInfo: { fontSize: 9, color: '#6B7280', lineHeight: 1.4 },
  
  invoiceTitle: { fontSize: 24, fontWeight: 700, color: '#111827', textAlign: 'right' },
  invoiceMeta: { textAlign: 'right', marginTop: 4 },
  metaRow: { flexDirection: 'row', justifyContent: 'flex-end', marginBottom: 2 },
  metaLabel: { color: '#9CA3AF', marginRight: 8 },
  metaValue: { fontWeight: 700 },

  // Client Info
  section: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 30 },
  sectionCol: { width: '45%' },
  sectionTitle: { fontSize: 9, fontWeight: 700, color: '#9CA3AF', textTransform: 'uppercase', marginBottom: 8 },
  clientName: { fontSize: 12, fontWeight: 700, marginBottom: 2 },
  clientText: { fontSize: 10, marginBottom: 2 },

  // Table
  table: { width: '100%', marginBottom: 20 },
  tableHeader: { flexDirection: 'row', backgroundColor: '#F3F4F6', padding: 8, borderRadius: 4 },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#F3F4F6', padding: 8 },
  
  colItem: { width: '50%' },
  colQty: { width: '15%', textAlign: 'center' },
  colPrice: { width: '15%', textAlign: 'right' },
  colTotal: { width: '20%', textAlign: 'right', fontWeight: 700 },

  // Totals
  totalsContainer: { flexDirection: 'row', justifyContent: 'flex-end', marginTop: 10 },
  totalsBox: { width: '40%' },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 4, borderBottomWidth: 1, borderBottomColor: '#F3F4F6' },
  grandTotalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 8, borderTopWidth: 2, borderTopColor: '#374151', marginTop: 4 },
  totalLabel: { color: '#6B7280' },
  grandTotalLabel: { fontSize: 12, fontWeight: 700 },
  grandTotalValue: { fontSize: 14, fontWeight: 700, color: '#2563EB' },

  footer: { position: 'absolute', bottom: 30, left: 40, right: 40, textAlign: 'center', fontSize: 8, color: '#9CA3AF', borderTopWidth: 1, borderTopColor: '#E5E7EB', paddingTop: 10 }
});

// === TYPES ===

interface InvoiceData {
    id: number;
    created_at: string;
    status: string;
    total_amount: string;
    client_info?: { name: string; email?: string };
    guest_name?: string;
    items: { name_at_moment: string; quantity: number; price_at_moment: number; subtotal: number }[];
}

// Flexible User Interface
export interface InvoiceUser {
    clinic_name?: string;
    first_name?: string;
    last_name?: string;
    name?: string; 
    city?: string;
    phone?: string;
    email?: string;
    [key: string]: any; 
}

export const InvoiceDocument = ({ invoice, user }: { invoice: InvoiceData, user?: InvoiceUser | null }) => {
    
    // 1. Client Data
    const clientName = invoice.client_info?.name || invoice.guest_name || 'Private Customer';
    const clientContact = invoice.client_info?.email || '';

    // 2. Provider Data (Doctor/Clinic)
    const userName = [user?.first_name, user?.last_name].filter(Boolean).join(' ') || user?.name || 'Veterinarian';
    const clinicTitle = user?.clinic_name || userName;
    
    const clinicCity = user?.city || '';
    const clinicContacts = [user?.phone, user?.email].filter(Boolean).join(' | ');

    return (
        <Document>
            <Page size="A4" style={styles.page}>
                
                {/* Header */}
                <View style={styles.header}>
                    <View>
                        <Text style={styles.logo}>{user?.clinic_name ? 'VET CLINIC' : 'VET DOCTOR'}</Text>
                        
                        <Text style={{ ...styles.companyInfo, fontWeight: 700, color: '#374151' }}>{clinicTitle}</Text>
                        {clinicCity && <Text style={styles.companyInfo}>{clinicCity}</Text>}
                        {clinicContacts && <Text style={styles.companyInfo}>{clinicContacts}</Text>}
                    </View>
                    
                    <View>
                        <Text style={styles.invoiceTitle}>INVOICE</Text>
                        <View style={styles.invoiceMeta}>
                            <View style={styles.metaRow}>
                                <Text style={styles.metaLabel}>Number:</Text>
                                <Text style={styles.metaValue}>#{invoice.id}</Text>
                            </View>
                            <View style={styles.metaRow}>
                                <Text style={styles.metaLabel}>Date:</Text>
                                <Text style={styles.metaValue}>
                                    {new Date(invoice.created_at).toLocaleDateString()}
                                </Text>
                            </View>
                            <View style={styles.metaRow}>
                                <Text style={styles.metaLabel}>Status:</Text>
                                <Text style={styles.metaValue}>
                                    {invoice.status === 'paid' ? 'PAID' : 'UNPAID'}
                                </Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Info Sections */}
                <View style={styles.section}>
                    {/* Provider */}
                    <View style={styles.sectionCol}>
                         <Text style={styles.sectionTitle}>Provider</Text>
                         <Text style={styles.clientName}>{clinicTitle}</Text>
                         <Text style={styles.clientText}>{clinicCity}</Text>
                    </View>

                    {/* Bill To */}
                    <View style={styles.sectionCol}>
                        <Text style={styles.sectionTitle}>Bill To</Text>
                        <Text style={styles.clientName}>{clientName}</Text>
                        {clientContact && <Text style={styles.clientText}>{clientContact}</Text>}
                    </View>
                </View>

                {/* Table */}
                <View style={styles.table}>
                    <View style={styles.tableHeader}>
                        <Text style={styles.colItem}>Description</Text>
                        <Text style={styles.colQty}>Qty</Text>
                        <Text style={styles.colPrice}>Price</Text>
                        <Text style={styles.colTotal}>Total</Text>
                    </View>
                    {invoice.items.map((item, i) => (
                        <View key={i} style={styles.tableRow}>
                            <Text style={styles.colItem}>{item.name_at_moment}</Text>
                            <Text style={styles.colQty}>{item.quantity}</Text>
                            <Text style={styles.colPrice}>{Number(item.price_at_moment).toFixed(2)}</Text>
                            <Text style={styles.colTotal}>{Number(item.subtotal).toFixed(2)}</Text>
                        </View>
                    ))}
                </View>

                {/* Totals */}
                <View style={styles.totalsContainer}>
                    <View style={styles.totalsBox}>
                        <View style={styles.totalRow}>
                            <Text style={styles.totalLabel}>Subtotal</Text>
                            <Text style={styles.metaValue}>{invoice.total_amount}</Text>
                        </View>
                        <View style={styles.grandTotalRow}>
                            <Text style={styles.grandTotalLabel}>TOTAL DUE</Text>
                            <Text style={styles.grandTotalValue}>{invoice.total_amount}</Text>
                        </View>
                    </View>
                </View>

                {/* Footer */}
                <Text style={styles.footer}>
                    Thank you for your business! {clinicTitle}
                </Text>

            </Page>
        </Document>
    );
};