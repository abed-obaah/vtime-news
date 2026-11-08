import { Image, Pressable, Text, View } from "react-native";
import allNews from '@assets/data/allNews.json';
import { formatDistanceToNow } from 'date-fns';
import { MaterialCommunityIcons } from '@expo/vector-icons'
import { News } from "@/types/types";
import NewsListItemFooter from "../NewsListItemFooter";
import { Link } from "expo-router";

type NewsListItemProps = {
  newsArticle: News;
}

export default function NewsListItem({ newsArticle }: NewsListItemProps) {
  return (
    <Link href={`newsArticle/${newsArticle.id}`} asChild>
      <Pressable style={{ backgroundColor: 'white', padding: 10, gap: 10, borderRadius: 10, marginBottom: 15 }}>
        <View style={{ flexDirection: 'row' }}>
          <View style={{ flexShrink: 1, marginRight: 15, gap: 5 }}>
            <Image source={require('@assets/black-logo.png')} style={{ width: 50, height: 20 }} resizeMode="contain" />
            <Text style={{ fontSize: 17, fontWeight: 'bold' }}>{newsArticle.title}</Text>
          </View>
          <Image source={{ uri: newsArticle.image }} style={{ width: 100, aspectRatio: 1, borderRadius: 10, marginLeft: 'auto' }} />
        </View>
        <NewsListItemFooter publishedDate={newsArticle.created_at} author={newsArticle.author} />
      </Pressable>
    </Link>
  )
}