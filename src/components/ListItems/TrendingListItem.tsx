import { News } from "@/types/types";
import { Image, Text, View, StyleSheet, Pressable } from "react-native";
import NewsListItemFooter from "../NewsListItemFooter";
import { Link } from "expo-router";

type TrendingListItemProps = {
  newsArticle: News;
  index: number;
}

export default function TrendingListItem({ newsArticle, index }: TrendingListItemProps) {
  return (
    <Link href={`newsArticle/${newsArticle.id}`} asChild>
      <Pressable style={{ flexDirection: 'row', marginBottom: 20, gap: 15 }}>
        <View style={styles.bubbleContainer}>
          <Text style={styles.bubleTitle}>{index}</Text>
        </View>
        <View style={styles.textContainer}>
          <View style={{ gap: 5 }}>
            <Image source={require('@assets/black-logo.png')} style={{ width: 50, height: 20 }} resizeMode="contain" />
            <Text style={{ fontSize: 18, fontWeight: 'bold' }}>{newsArticle.title}</Text>
          </View>
          <NewsListItemFooter publishedDate={newsArticle.created_at} author={newsArticle.author} />
        </View>
      </Pressable>
    </Link>
  )
}

const styles = StyleSheet.create({
  bubbleContainer: {
    backgroundColor: '#F59E0B',
    width: 35,
    height: 35,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center'
  },
  bubleTitle: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 18
  },
  textContainer: {
    gap: 25,
    flex: 1,
    borderBottomWidth: 0.5,
    borderBottomColor: 'lightgrey',
    paddingBottom: 10
  }
})