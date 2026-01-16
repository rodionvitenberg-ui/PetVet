import React from 'react';
import { Page, Text, View, Document, StyleSheet, Image, Font } from '@react-pdf/renderer';
import { PetDetail, UserProfile, TemporaryOwnerProfile } from '@/types/pet';

// 1. Регистрируем шрифты (Roboto)
Font.register({
  family: 'Roboto',
  fonts: [
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-regular-webfont.ttf', fontWeight: 400 },
    { src: 'https://cdnjs.cloudflare.com/ajax/libs/ink/3.1.10/fonts/Roboto/roboto-bold-webfont.ttf', fontWeight: 700 },
  ],
});

const styles = StyleSheet.create({
  page: { flexDirection: 'column', backgroundColor: '#FFFFFF', padding: 30, fontFamily: 'Roboto' },
  
  // Header
  header: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 20, borderBottomWidth: 2, borderBottomColor: '#3B82F6', paddingBottom: 10 },
  headerLeft: { flexDirection: 'column' },
  title: { fontSize: 24, color: '#111827', fontWeight: 700 },
  subtitle: { fontSize: 10, color: '#6B7280', marginTop: 2 },
  headerId: { fontSize: 10, color: '#3B82F6' },

  // Identity Section
  identitySection: { flexDirection: 'row', marginBottom: 20 },
  imageContainer: { width: 120, height: 120, marginRight: 20, borderRadius: 10, overflow: 'hidden', backgroundColor: '#F3F4F6' },
  petImage: { width: '100%', height: '100%', objectFit: 'cover' },
  
  infoGrid: { flex: 1, flexDirection: 'row', flexWrap: 'wrap' },
  infoItem: { width: '50%', marginBottom: 10 },
  label: { fontSize: 8, color: '#9CA3AF', marginBottom: 2, textTransform: 'uppercase' },
  value: { fontSize: 11, color: '#1F2937', fontWeight: 700 },
  
  // Owner Section
  ownerSection: { backgroundColor: '#EFF6FF', padding: 10, borderRadius: 5, marginBottom: 20 },
  ownerTitle: { fontSize: 10, fontWeight: 700, color: '#1E40AF', marginBottom: 5 },
  ownerRow: { flexDirection: 'row', justifyContent: 'space-between' },
  ownerText: { fontSize: 10, color: '#1F2937' },
  
  // History Table
  tableTitle: { fontSize: 14, fontWeight: 700, marginBottom: 10, color: '#111827' },
  tableHeader: { flexDirection: 'row', backgroundColor: '#F3F4F6', padding: 6, borderRadius: 4 },
  tableRow: { flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#E5E7EB', padding: 6, alignItems: 'center' }, // align items center
  
  colDate: { width: '20%', fontSize: 9 },
  colType: { width: '25%', fontSize: 9, fontWeight: 700, color: '#4B5563' },
  colEvent: { width: '55%', fontSize: 9, flexDirection: 'column' }, // column layout for details
  
  // Footer
  footer: { position: 'absolute', bottom: 30, left: 30, right: 30, fontSize: 8, textAlign: 'center', color: '#9CA3AF' },
});

// === ХЕЛПЕРЫ ===

const formatDate = (dateString: string | undefined | null, locale: string) => {
    if (!dateString) return '-';
    try {
        return new Date(dateString).toLocaleDateString(locale, { day: '2-digit', month: '2-digit', year: 'numeric' });
    } catch (e) {
        return dateString;
    }
};

const getAbsoluteImageUrl = (url: string | undefined | null) => {
    if (!url) return undefined;
    if (url.startsWith('http')) return url;
    
    const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:8000';
    const cleanApi = apiUrl.replace(/\/$/, '');
    const cleanUrl = url.startsWith('/') ? url : `/${url}`;
    
    return `${cleanApi}${cleanUrl}`;
};

const getOwnerContact = (ownerInfo: UserProfile | TemporaryOwnerProfile | undefined): string => {
    if (!ownerInfo) return '';
    if ('is_temporary' in ownerInfo && ownerInfo.is_temporary) {
        return (ownerInfo as TemporaryOwnerProfile).phone || '';
    }
    const user = ownerInfo as UserProfile;
    if (user.phone) return user.phone;
    if (user.contacts && user.contacts.length > 0) {
        return `${user.contacts[0].type_display}: ${user.contacts[0].value}`;
    }
    return user.email;
};

// === КОМПОНЕНТ ===

interface PassportProps {
    pet: PetDetail;
    t: (key: string) => string;
    locale: string;
}

export const PetPassportDocument = ({ pet, t, locale }: PassportProps) => {
    const mainImageObj = pet.images?.find(img => img.is_main) || pet.images?.[0];
    const imageUrl = getAbsoluteImageUrl(mainImageObj?.image);

    return (
        <Document>
            <Page size="A4" style={styles.page}>
            
            {/* HEADER */}
            <View style={styles.header}>
                <View style={styles.headerLeft}>
                    <Text style={styles.title}>{t('title')}</Text> 
                    <Text style={styles.subtitle}>CareYour.Pet Digital Record</Text>
                </View>
                <Text style={styles.headerId}>ID: {pet.id}</Text>
            </View>

            {/* IDENTITY SECTION */}
            <View style={styles.identitySection}>
                <View style={styles.imageContainer}>
                    {imageUrl && (
                        <Image src={imageUrl} style={styles.petImage} />
                    )}
                </View>
                
                <View style={styles.infoGrid}>
                    <View style={styles.infoItem}>
                        <Text style={styles.label}>{t('name')}</Text>
                        <Text style={styles.value}>{pet.name}</Text>
                    </View>
                    
                    <View style={styles.infoItem}>
                        <Text style={styles.label}>{t('breed')}</Text>
                        <Text style={styles.value}>
                            {pet.breed || pet.species || '-'} 
                        </Text>
                    </View>

                    <View style={styles.infoItem}>
                        <Text style={styles.label}>{t('gender')}</Text>
                        <Text style={styles.value}>
                            {pet.gender === 'M' ? t('male') : t('female')}
                        </Text>
                    </View>
                    <View style={styles.infoItem}>
                        <Text style={styles.label}>{t('dob')}</Text>
                        <Text style={styles.value}>{formatDate(pet.birth_date, locale)}</Text>
                    </View>

                    {/* Вывод доп. атрибутов (Чип, Вес и т.д.) */}
                    {pet.attributes?.slice(0, 4).map((attr, idx) => {
                         if (attr.attribute.slug.includes('breed') || attr.attribute.slug.includes('пород')) return null;
                         
                         return (
                            <View key={idx} style={styles.infoItem}>
                                <Text style={styles.label}>{attr.attribute.name}</Text>
                                <Text style={styles.value}>
                                    {attr.value} {attr.attribute.unit || ''}
                                </Text>
                            </View>
                         );
                    })}
                </View>
            </View>

            {/* OWNER SECTION */}
            <View style={styles.ownerSection}>
                <Text style={styles.ownerTitle}>{t('owner')}</Text>
                <View style={styles.ownerRow}>
                    <Text style={styles.ownerText}>
                        {pet.owner_info?.name || pet.temp_owner_name || t('unknown')}
                    </Text>
                    <Text style={styles.ownerText}>
                        {getOwnerContact(pet.owner_info as UserProfile | TemporaryOwnerProfile) || pet.temp_owner_phone}
                    </Text>
                </View>
            </View>

            {/* MEDICAL HISTORY TABLE */}
            <Text style={styles.tableTitle}>{t('history_title')}</Text>
            
            <View style={styles.tableHeader}>
                <Text style={styles.colDate}>{t('col_date')}</Text>
                <Text style={styles.colType}>{t('col_type')}</Text>
                <Text style={styles.colEvent}>{t('col_event')}</Text>
            </View>

            {pet.recent_events && pet.recent_events.length > 0 ? (
                pet.recent_events.slice(0, 15).map((event, i) => {
                    // [UPDATED] Определяем актуальное название типа события
                    const typeName = event.event_type?.name || event.event_type_display || '-';
                    
                    // [UPDATED] Получаем информацию о враче/клинике
                    const author = event.created_by_info?.clinic_name || event.created_by_info?.name;
                    const isVet = event.created_by_info?.is_vet;

                    return (
                        <View key={i} style={styles.tableRow}>
                            <Text style={styles.colDate}>{formatDate(event.date, locale)}</Text>
                            
                            <Text style={styles.colType}>
                                {typeName}
                                {event.status === 'planned' ? ' (План)' : ''}
                            </Text>
                            
                            <View style={styles.colEvent}>
                                <Text style={{ color: '#111827' }}>
                                    {event.title || (event.description ? event.description.substring(0, 40) : '-')}
                                </Text>
                                
                                {/* [NEW] Вывод клиники или врача мелким шрифтом */}
                                {author && (
                                    <Text style={{ fontSize: 8, color: '#6B7280', marginTop: 2 }}>
                                        {isVet ? 'Клиника: ' : 'Автор: '} {author}
                                    </Text>
                                )}
                            </View>
                        </View>
                    );
                })
            ) : (
                <View style={{ marginTop: 10 }}>
                    <Text style={{ fontSize: 10, color: '#9CA3AF', textAlign: 'center' }}>{t('no_records')}</Text>
                </View>
            )}

            {/* FOOTER */}
            <Text style={styles.footer}>
                {t('footer_text')} | Generated on {new Date().toLocaleDateString()}
            </Text>

            </Page>
        </Document>
    );
};