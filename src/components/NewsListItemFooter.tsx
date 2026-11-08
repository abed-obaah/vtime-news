import { formatDistanceToNow } from "date-fns";
import { Text, View } from "react-native";
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { Author } from "@/types/types";

type NewsListItemFooterProps = {
  publishedDate: string;
  author: Author;
}

export default function NewsListItemFooter({ publishedDate, author }: NewsListItemFooterProps) {
  return (
    <View style={{ flexDirection: 'row', gap: 5 }}>
      <Text>{formatDistanceToNow(publishedDate, { addSuffix: true })}</Text>
      <Text>&#x2022;</Text>
      <Text>{author.name}</Text>
      <MaterialCommunityIcons name="dots-horizontal" size={22} color="grey" style={{ marginLeft: 'auto' }} />
    </View>
  )
}