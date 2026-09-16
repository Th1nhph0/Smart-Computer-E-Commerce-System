/**
 * Main JS - Bakery Management System
 */
'use strict';

let menu, animate;

(function () {
    document.addEventListener('DOMContentLoaded', () => {
        const currentRole = localStorage.getItem('userRole') || localStorage.getItem('role') || localStorage.getItem('userrole');
        const currentName = localStorage.getItem('userName') || localStorage.getItem('username') || localStorage.getItem('fullName');
        const currentUserId = localStorage.getItem('userId') || localStorage.getItem('id');

        if (!currentRole && !window.location.href.includes('auth-')) {
            window.location.href = 'auth-login-basic.html';
            return;
        }

        const navName = document.getElementById('navUserFullName'); 
        const navRole = document.getElementById('navUserRole');     

        if (navName && currentName) navName.innerText = currentName;
        if (navRole && currentRole) navRole.innerText = currentRole;

        const accountSettingsLink = document.getElementById('navAccountSettings');
        if (accountSettingsLink && currentUserId) {
            accountSettingsLink.href = `add-employee.html?id=${currentUserId}`;
        }

        if (localStorage.getItem('showWelcome') === 'true') {
            alert(`Chào mừng ${currentName} đã trở lại hệ thống tiệm bánh!`);
            localStorage.removeItem('showWelcome');
        }

        const roleLower = currentRole ? currentRole.toLowerCase().trim() : '';
        const isBoss = roleLower === 'admin' || roleLower === 'chủ quán' || roleLower === 'chuquan' || roleLower === 'quản trị web';

        if (!isBoss) {
            const menuAddEmp = document.getElementById('menu-add-employee');
            if (menuAddEmp) menuAddEmp.style.display = 'none';
        }
    });

    // Khởi tạo khung cấu trúc Menu Template
    let layoutMenuEl = document.querySelectorAll('#layout-menu');
    layoutMenuEl.forEach(function (element) {
        menu = new Menu(element, {
            orientation: 'vertical',
            closeChildren: false
        });
        window.Helpers.scrollToActive((animate = false));
        window.Helpers.mainMenu = menu;
    });

    let menuToggler = document.querySelectorAll('.layout-menu-toggle');
    menuToggler.forEach(item => {
        item.addEventListener('click', event => {
            event.preventDefault();
            window.Helpers.toggleCollapsed();
        });
    });

    let delay = function (elem, callback) {
        let timeout = null;
        elem.onmouseenter = function () {
            if (!Helpers.isSmallScreen()) {
                timeout = setTimeout(callback, 300);
            } else {
                timeout = setTimeout(callback, 0);
            }
        };
        elem.onmouseleave = function () {
            document.querySelector('.layout-menu-toggle').classList.remove('d-block');
            clearTimeout(timeout);
        };
    };
    if (document.getElementById('layout-menu')) {
        delay(document.getElementById('layout-menu'), function () {
            if (!Helpers.isSmallScreen()) {
                document.querySelector('.layout-menu-toggle').classList.add('d-block');
            }
        });
    }

    let menuInnerContainer = document.getElementsByClassName('menu-inner'),
        menuInnerShadow = document.getElementsByClassName('menu-inner-shadow')[0];
    if (menuInnerContainer.length > 0 && menuInnerShadow) {
        menuInnerContainer[0].addEventListener('ps-scroll-y', function () {
            if (this.querySelector('.ps__thumb-y').offsetTop) {
                menuInnerShadow.style.display = 'block';
            } else {
                menuInnerShadow.style.display = 'none';
            }
        });
    }

    const tooltipTriggerList = [].slice.call(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.map(function (tooltipTriggerEl) {
        return new bootstrap.Tooltip(tooltipTriggerEl);
    });

    const accordionActiveFunction = function (e) {
        if (e.type == 'show.bs.collapse') {
            e.target.closest('.accordion-item').classList.add('active');
        } else {
            e.target.closest('.accordion-item').classList.remove('active');
        }
    };

    const accordionTriggerList = [].slice.call(document.querySelectorAll('.accordion'));
    accordionTriggerList.map(function (accordionTriggerEl) {
        accordionTriggerEl.addEventListener('show.bs.collapse', accordionActiveFunction);
        accordionTriggerEl.addEventListener('hide.bs.collapse', accordionActiveFunction);
    });

    window.Helpers.setAutoUpdate(true);
    window.Helpers.initPasswordToggle();
    window.Helpers.initSpeechToText();

    if (window.Helpers.isSmallScreen()) {
        return;
    }
    window.Helpers.setCollapsed(true, false);
})();

function searchTable() {
    const input = document.getElementById("searchInput");
    if (!input) return;

    const filter = input.value.toLowerCase().trim();
    const tbody = document.querySelector("tbody");
    if (!tbody) return;

    const rows = tbody.getElementsByTagName("tr");

    for (let i = 0; i < rows.length; i++) {
        const rowText = rows[i].innerText.toLowerCase();
        if (rowText.includes(filter)) {
            rows[i].style.display = "";
        } else {
            rows[i].style.display = "none";
        }
    }
}

document.addEventListener('DOMContentLoaded', function () {
    let currentUrl = window.location.pathname.split('/').pop();
    if (currentUrl === '' || currentUrl === '/') currentUrl = 'index.html';

    const menuLinks = document.querySelectorAll('.menu-inner .menu-link');
    menuLinks.forEach(link => {
        if (link.getAttribute('href') === currentUrl) {
            link.parentElement.classList.add('active');
            const parentMenu = link.closest('.menu-sub');
            if (parentMenu) {
                parentMenu.parentElement.classList.add('active', 'open');
            }
        }
    });
});