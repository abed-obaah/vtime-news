import { Magazine } from "@/types/types";
import { useState } from "react";
import { Image, Pressable, Text, View } from "react-native";
import { Entypo } from '@expo/vector-icons';

type MagazineListItemProps = {
  magazine: Magazine;
}

export default function MagazineListItem({ magazine }: MagazineListItemProps) {
  const [isFollowingPressed, setIsFollowingPressed] = useState<boolean>(magazine.isFollowing)

  const renderFollowButton = () => {
    if (isFollowingPressed) {
      return (
        <View style={{ flexDirection: 'row', alignItems: 'center', paddingVertical: 2 }}>
          <Entypo name="check" size={12} color="grey" />
          <Text style={{ fontWeight: 'bold', fontSize: 10, color: 'grey' }}>FOLLOWING</Text>
        </View>
      )
    }

    return (
      <Text style={{
        fontWeight: 'bold',
        fontSize: 10,
        borderWidth: 1.5,
        borderColor: '#DC2626',
        paddingHorizontal: 10,
        paddingVertical: 1,
        borderRadius: 10,
        color: '#DC2626',
        alignSelf: 'flex-start'
      }}>
        FOLLOW
      </Text>
    )
  };

  return (
    <View style={{ flex: 0.5, padding: 10, gap: 5 }}>
      <Image source={{ uri: magazine.image }} style={{ width: '100%', aspectRatio: 3 / 4, borderRadius: 5 }} />
      <Text style={{ fontWeight: 'bold' }}>Magazine Title</Text>
      <Pressable onPress={() => setIsFollowingPressed((currentValue) => !currentValue)}>
        {renderFollowButton()}
      </Pressable>
    </View>
  )
}