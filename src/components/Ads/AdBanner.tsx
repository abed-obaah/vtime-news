import { useEffect, useState } from 'react';
import { Image, Linking, Pressable, Text, View } from 'react-native';
import { Ad, fetchAds, trackClick, trackImpression } from '@/services/api';

type AdBannerProps = {
  placement?: string;
  style?: object;
};

export default function AdBanner({ placement = 'banner', style }: AdBannerProps) {
  const [ad, setAd] = useState<Ad | null>(null);

  useEffect(() => {
    fetchAds(placement)
      .then((ads) => {
        if (ads.length > 0) {
          setAd(ads[0]);
          trackImpression(ads[0].id);
        }
      })
      .catch(() => {});
  }, [placement]);

  if (!ad) return null;

  const handlePress = () => {
    trackClick(ad.id);
    if (ad.link) Linking.openURL(ad.link).catch(() => {});
  };

  return (
    <Pressable
      onPress={handlePress}
      style={[
        {
          backgroundColor: '#F5F5F5',
          borderRadius: 10,
          overflow: 'hidden',
          marginVertical: 10,
          borderWidth: 1,
          borderColor: '#E0E0E0',
        },
        style,
      ]}
    >
      {ad.image ? (
        <Image
          source={{ uri: ad.image }}
          style={{ width: '100%', height: 80 }}
          resizeMode="cover"
        />
      ) : null}
      <View style={{ padding: 10 }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 3 }}>
          <Text style={{ fontSize: 9, color: '#AAAAAA', textTransform: 'uppercase', letterSpacing: 0.5 }}>
            Sponsored {ad.networkName ? `· ${ad.networkName}` : ''}
          </Text>
        </View>
        <Text style={{ fontWeight: '700', fontSize: 14 }} numberOfLines={2}>
          {ad.title}
        </Text>
        {ad.description ? (
          <Text style={{ color: '#666', fontSize: 12, marginTop: 3 }} numberOfLines={2}>
            {ad.description}
          </Text>
        ) : null}
      </View>
    </Pressable>
  );
}
