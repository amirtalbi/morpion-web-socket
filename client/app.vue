<template>
  <div class="min-h-screen bg-gray-100">
    <nav class="bg-white shadow-md p-4">
      <h1 class="text-2xl font-bold text-center text-blue-600">Morpion Game</h1>
    </nav>

    <main class="container mx-auto p-4">
      <NuxtPage />
    </main>

    <footer class="fixed bottom-0 w-full bg-white shadow-md p-4">
      <p class="text-center text-gray-600">© 2025 Morpion Game</p>
    </footer>
  </div>
</template>

<script setup>
useHead({
  link: [
    {
      rel: "stylesheet",
      href: "https://fonts.googleapis.com/css2?family=Caveat:wght@700&display=swap",
    },
  ],
});
</script>

<style>
html,
body {
  margin: 0;
  padding: 0;
}
</style>
