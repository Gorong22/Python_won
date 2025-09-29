
import { products } from './data/products.js';
import { reviews } from './data/reviews.js';

document.addEventListener('DOMContentLoaded', () => {
  // Mobile menu
  const menuButton = document.getElementById('mobile-menu-button');
  const mobileMenu = document.getElementById('mobile-menu');
  menuButton.addEventListener('click', () => {
    mobileMenu.classList.toggle('active');
  });

  // Load products
  const productsGrid = document.getElementById('products-grid');
  if (productsGrid) {
    products.forEach(product => {
      const card = document.createElement('div');
      card.className = 'card';
      card.innerHTML = `
        <img src="${product.image}" alt="${product.name}">
        <div class="card-content">
          <h3>${product.name}</h3>
          <p>${product.description}</p>
          <div class="price">${product.price.toLocaleString()}원</div>
        </div>
      `;
      productsGrid.appendChild(card);
    });
  }

  // Load reviews
  const reviewsGrid = document.getElementById('reviews-grid');
  if (reviewsGrid) {
    reviews.forEach(review => {
      const reviewCard = document.createElement('div');
      reviewCard.className = 'review-card';
      reviewCard.innerHTML = `
        <div class="images">
          <img src="${review.beforeImage}" alt="Before">
          <img src="${review.afterImage}" alt="After">
        </div>
        <p class="comment">"${review.comment}"</p>
        <p class="author">- ${review.author}</p>
      `;
      reviewsGrid.appendChild(reviewCard);
    });
  }
});
