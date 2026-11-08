import { News } from "@/types/types";
import { Image, Text, View, StyleSheet, Pressable } from "react-native";
import NewsListItemFooter from "@/components/NewsListItemFooter";
import { Link } from "expo-router";

type MainNewsCardProps = {
  newsArticle: News;
}

export default function MainNewsCard({ newsArticle }: MainNewsCardProps) {
  return (
    <Link href={`newsArticle/${newsArticle.id}`} asChild>
      <Pressable style={styles.container}>
        <Image source={{ uri: newsArticle.image }} style={styles.mainIamge} />
        <View style={{ padding: 10 }}>
          <Image source={require('@assets/black-logo.png')} style={{ width: 60, height: 20, marginBlock: 5 }} resizeMode="contain" />
          <Text style={{ fontSize: 20, fontWeight: 'bold', marginBottom: 25 }}>{newsArticle.title}</Text>
          <NewsListItemFooter publishedDate={newsArticle.created_at} author={newsArticle.author} />
        </View>
      </Pressable>
    </Link>
  )
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'white',
    marginBottom: 15,
    borderRadius: 10
  },
  mainIamge: {
    width: '100%',
    aspectRatio: 4 / 3,
    borderTopLeftRadius: 10,
    borderTopRightRadius: 10,
  }
})