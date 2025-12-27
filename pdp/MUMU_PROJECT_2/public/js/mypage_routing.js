// MyPage Role-Based Routing
export async function routeToMyPage() {
  const user = await getCurrentFirebaseUser();
  if (!user || !user.uid) {
    window.location.href = "login.html";
    return;
  }

  try {
    const creatorDoc = await window.firebase
      .firestore()
      .collection("creators")
      .doc(user.uid)
      .get();

    if (creatorDoc.exists) {
      window.location.href = "mypage_creator.html";
    } else {
      window.location.href = "mypage_reader.html";
    }
  } catch (error) {
    console.error("[Route] Failed:", error);
    window.location.href = "mypage_reader.html";
  }
}

window.routeToMyPage = routeToMyPage;
